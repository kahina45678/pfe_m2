import logging
import re
from flask import Flask, request, jsonify, session
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import json
import time
from datetime import datetime
import sqlite3
import requests
import qrcode
import os
from urllib.parse import urlparse
import io
from dotenv import load_dotenv
import base64
from threading import Timer
from easyocr import Reader 
from io import BytesIO
from PIL import Image
from db import (
    init_db, get_quizzes_by_user, get_quiz_by_id, create_quiz, update_quiz,
    delete_quiz, create_room, get_room_by_code, save_score, get_leaderboard,
    get_db_connection
)
from rag_wiki import generate_quiz_from_wikipedia
from motcle import init_kbert, extract_kw
from images import search_and_display_images, filtrer
from trad import init_traduction, traduire
from moteur_rech import correction_mot, init_model_recherche,charger_mots,chercher_bert, mot_existe,rechercher_re

# from rag import generate_quiz,init_rag

# Initialize Flask app

app = Flask(__name__)
app.secret_key = 'quiz_app_secret_key'  # Change this in production
CORS(app, supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="*")  

load_dotenv()
# init_rag()
# Configuration Unsplash
# UNSPLASH_KEY = os.environ['UNSPLASH_KEY']
UNSPLASH_KEY='Ee0ofjghUT6ONRqY-Lb5S68AMNrQ5xUjrcNyGF3fZo8'
UNSPLASH_API = "https://api.unsplash.com"

reader = Reader(['en'], gpu=False)

# Initialize database
init_db()
tokenizer_trad, model_trad = init_traduction()

kb=init_kbert()
mots=charger_mots()
model_mr = init_model_recherche()
# Active quiz rooms
active_rooms = {}
user_rooms = {}
timers = {}  # Pour stocker les timers de chaque room

# Routes
@app.route('/api/quizzes/ai', methods=['POST'])
def api_generate_quiz():
    data = request.json
    print("📥 Requête reçue:", data)

    subject = data.get("theme", "history")
    difficulty = data.get("difficulty", "medium")
    nb_qst = int(data.get("count", 5))
    qtype = data.get("qtype", "MCQ")
    
    try:
        quiz = generate_quiz_from_wikipedia(subject, difficulty, nb_qst, qtype)
        print("🧠 Contenu brut généré par le modèle :\n", quiz)
        questions = []

        # Choix de la regex selon qtype
        if qtype == "MCQ":
            pattern = re.compile(r"""(?msx)
                \s*(\d+)\)\s+               # numéro de la question
                (.+?)\n                     # énoncé
                \s*A\)\s+(.+?)\n            # option A
                \s*B\)\s+(.+?)\n            # option B
                \s*C\)\s+(.+?)\n            # option C
                \s*D\)\s+(.+?)\n            # option D
                \s*Answer:\s*(?:\(|\[)?([ABCD])(?:\)|\])?\s*   # réponse entre rien, (), ou []
            """)

            # pattern = re.compile(r"""(?msx)
            #     \s*(\d+)\)\s+
            #     (.+?)\n
            #     \s*A\)\s+(.+?)\n
            #     \s*B\)\s+(.+?)\n
            #     \s*C\)\s+(.+?)\n
            #     \s*D\)\s+(.+?)\n
            #     \s*Answer:\s+([ABCD])\s*
            # """)
            print("🔍 Regex MCQ utilisée:", pattern.pattern)

            for match in pattern.finditer(quiz):
                question_text = match.group(2).strip()
                options = [match.group(i).strip() for i in range(3, 7)]
                correct = match.group(7).strip()
                print(f"📌 MCQ détectée: {question_text}")
                print(f"🔸 Options: {options} | ✅ Réponse: {correct}")

                questions.append({
                    "question": question_text,
                    "propositions": options,
                    "correct_answer": correct,
                    "image": None,
                    "type": "qcm"
                })

        elif qtype == "true_false":
            pattern = re.compile(
                r"\d+\)\s*(.+?)\nAnswer:\s*(True|False)",
                re.IGNORECASE
            )
            print("🔍 Regex TrueFalse utilisée:", pattern.pattern)

            for match in pattern.finditer(quiz):
                print(f"📌 TF détectée: {match.group(1).strip()} ✅ Réponse: {match.group(2).capitalize()}")
                questions.append({
                    "question": match.group(1).strip(),
                    "propositions": ["True", "False"],
                    "correct_answer": match.group(2).capitalize(),
                    "image": None,
                    "type": "true_false"
                })

        elif qtype == "Open":
            pattern = re.compile(
                r"\d+\)\s*(.+?)\nAnswer:\s*(.+)",
                re.DOTALL
            )
            print("🔍 Regex Open utilisée:", pattern.pattern)

            for match in pattern.finditer(quiz):
                print(f"📌 Question ouverte: {match.group(1).strip()}")
                questions.append({
                    "question": match.group(1).strip(),
                    "propositions": [],
                    "image": None,
                    "type": "open_question"
                })

        else:
            logging.error(f"❌ Type de question non supporté : {qtype}")
            return jsonify({"error": f"Unsupported question type: {qtype}"}), 400

        if not questions:
            logging.error("❌ Aucune question valide trouvée dans le texte généré")
            return jsonify({"error": "Failed to parse questions from model response"}), 500

        for qst in questions:
            try:
                txt = qst['question']
                print(f"🔎 Extraction mot-clé pour : {txt}")
                mot_cle = extract_kw(kb, txt)
                print(f"🧠 Mot-clé extrait : {mot_cle}")

                if not mot_cle:
                    logging.warning(f"⚠️ Mot-clé vide pour la question : {txt}")
                    mot_cle = subject  

                print(f"🖼️ Recherche d'images avec : {mot_cle}")
                images = search_and_display_images(mot_cle)
                print(f"📸 Images trouvées : {images}")
                img_url = filtrer(images) if images else None
                if img_url:
                    qst["image"] = {
                        "url": img_url,
                        "source": "unsplash"
                    }
                else:
                    qst["image"] = None


                
                
            except Exception as e:
                logging.exception(f"⚠️ Erreur lors du traitement image/mot-clé pour : {txt}")
                qst["image"] = None

        # Connexion DB
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            print("✅ Connexion à la base de données établie")

            title = f"Quiz on {subject.capitalize()} ({difficulty.capitalize()})"
            description = f"Auto-generated quiz about {subject}."
            user_id = data.get("user_id", 987654321)

            cursor.execute('''
                INSERT INTO quizzes (title, description, user_id)
                VALUES (?, ?, ?)
            ''', (title, description, user_id))
            
            quiz_id = cursor.lastrowid
            print(f"🆔 Quiz inséré avec ID : {quiz_id}")

            for qst in questions:
                propositions = qst["propositions"]
                option_a = propositions[0] if len(propositions) > 0 else None
                option_b = propositions[1] if len(propositions) > 1 else None
                option_c = propositions[2] if len(propositions) > 2 else None
                option_d = propositions[3] if len(propositions) > 3 else None

                
                if qst["type"] == "qcm":
                    correct_letter = qst["correct_answer"]
                    letter_to_index = {"A": 0, "B": 1, "C": 2, "D": 3}
                    idx = letter_to_index.get(correct_letter.upper(), None)
                    correct_text = propositions[idx] if idx is not None and idx < len(propositions) else correct_letter
                elif qst["type"] == "true_false":
                    correct_text = "Vrai" if qst["correct_answer"].lower() == "true" else "Faux"
                else:
                    correct_text = qst["correct_answer"]

                print(f"📝 Insertion question: {qst['question']}")

                cursor.execute('''
                    INSERT INTO questions (
                        quiz_id, question, option_a, option_b, option_c, option_d,
                        correct_answer, type, image_url, image_source
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    quiz_id,
                    qst["question"],
                    option_a,
                    option_b,
                    option_c,
                    option_d,
                    correct_text,
                    qst["type"],
                    qst["image"]["url"] if qst["image"] else None,
                    qst["image"]["source"] if qst["image"] else "none"

                ))

            conn.commit()
            conn.close()
            print("✅ Quiz et questions enregistrés avec succès")

        except Exception as db_err:
            logging.exception("❌ Erreur lors de l'enregistrement en base")
            return jsonify({"error": "Database error"}), 500

        return jsonify({"success": True, "quiz_id": quiz_id}), 201

    except Exception as e:
        logging.exception("❌ Erreur inattendue pendant la génération du quiz")
        return jsonify({"error": str(e)}), 500
    


@app.route('/api/quizzes/traduction', methods=['POST'])
def api_traduction():
    print("🔥 Request received at /api/quizzes/traduction")
    try:
        print("\n📥 [INFO] Requête POST reçue sur /api/quizzes/traduction")
        data = request.get_json()
        print("📦 Données JSON reçues :", data)

        quiz_id = data.get("quiz_id")
        print(f"🔍 [DEBUG] ID du quiz à traduire : {quiz_id}")
        if not quiz_id:
            print("❗ [ERREUR] quiz_id manquant dans les données envoyées.")
            return jsonify({"error": "quiz_id manquant"}), 400

        conn = sqlite3.connect("quiz.db")
        cursor = conn.cursor()

        print("🔎 [INFO] Recherche du quiz original dans la base...")
        cursor.execute("SELECT title, description, user_id FROM quizzes WHERE id = ?", (quiz_id,))
        quiz_row = cursor.fetchone()
        if not quiz_row:
            print("❌ [ERREUR] Quiz non trouvé pour l'ID donné.")
            return jsonify({"error": "Quiz non trouvé"}), 404

        original_title, original_description, user_id = quiz_row
        print(f"📄 Titre original : {original_title}")
        print(f"📝 Description originale : {original_description}")

        print("🌍 Traduction du titre et de la description...")
        translated_title = traduire(original_title, tokenizer_trad, model_trad)
        translated_description = traduire(original_description, tokenizer_trad, model_trad)

        print(f"✅ Titre traduit : {translated_title}")
        print(f"✅ Description traduite : {translated_description}")

        print("➕ Insertion du nouveau quiz traduit...")
        cursor.execute(
            "INSERT INTO quizzes (title, description, user_id) VALUES (?, ?, ?)",
            (translated_title, translated_description, user_id)
        )
        new_quiz_id = cursor.lastrowid
        print(f"🆕 Nouveau quiz inséré avec ID : {new_quiz_id}")

        print("📥 Récupération des questions du quiz original...")
        cursor.execute('''
            SELECT question, option_a, option_b, option_c, option_d, correct_answer,
                   type, points, time_limit, image_url, image_source
            FROM questions WHERE quiz_id = ?
        ''', (quiz_id,))
        questions = cursor.fetchall()

        print(f"📊 Nombre de questions récupérées : {len(questions)}")

        for idx, row in enumerate(questions, 1):
            question_text, a, b, c, d, correct, qtype, points, time_limit, img_url, img_src = row
            print(f"\n--- 🔄 Traduction de la question {idx} ---")
            print(f"❓ Texte original : {question_text}")

            question_text = traduire(question_text, tokenizer_trad, model_trad)

            if qtype == "qcm":
                a = traduire(a, tokenizer_trad, model_trad)
                b = traduire(b, tokenizer_trad, model_trad)
                c = traduire(c, tokenizer_trad, model_trad)
                d = traduire(d, tokenizer_trad, model_trad)
                correct = traduire(correct, tokenizer_trad, model_trad)
            elif qtype == "true_false":
                a = "Vrai" if a.lower() == "true" else "Faux"
                b = "Faux" if b.lower() == "false" else "Vrai"
                c = d = None
                correct = "Vrai" if correct.lower() == "true" else "Faux"
            else:
                a = b = c = d = correct = None 

            print(f"✅ Texte traduit : {question_text}")

            cursor.execute('''
                INSERT INTO questions (
                    quiz_id, question, option_a, option_b, option_c, option_d,
                    correct_answer, type, points, time_limit, image_url, image_source
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                new_quiz_id, question_text, a, b, c, d, correct,
                qtype, points, time_limit, img_url, img_src
            ))
            print(f"📥 Question insérée pour le quiz {new_quiz_id}")

        conn.commit()
        conn.close()
        print("\n✅✅ Traduction complète et enregistrement réussi.")

        response = {
            "message": "✅ Quiz traduit et dupliqué avec succès",
            "new_quiz_id": new_quiz_id
        }
        print("📤 Réponse envoyée au frontend :", response)
        return jsonify(response), 200

    except Exception as e:
        logging.exception("❌ Erreur critique dans /api/quizzes/traduction")
        print("🚨 Exception capturée :", str(e))
        return jsonify({"error": str(e)}), 500


@app.route('/api/quizzes/mr', methods=['POST'])
def moteur_recherche():
    data = request.get_json()
    print("📥 Requête reçue:", data)

    search_text = data.get("query", "").strip()
    liste_mots=search_text.split(" ")
    for i in range(len(liste_mots)):
        if not mot_existe(liste_mots[i], mots):
            i = correction_mot(liste_mots[i])
            liste_mots[i] = i
    search_text = " ".join(liste_mots)
             

    filters = data.get("filters", [])
    user_id = data.get("user_id", None)

    query = "SELECT id, title, description FROM quizzes"
    conditions = []
    params = []

    if search_text:
        like_clause = f"%{search_text}%"
        filter_conditions = []

        if "all" in filters or not filters:
            filter_conditions.extend(["title LIKE ?", "description LIKE ?"])
            params.extend([like_clause, like_clause])
        else:
            if "titles" in filters:
                filter_conditions.append("title LIKE ?")
                params.append(like_clause)
            if "descriptions" in filters:
                filter_conditions.append("description LIKE ?")
                params.append(like_clause)

        if filter_conditions:
            conditions.append(f"({' OR '.join(filter_conditions)})")

    if user_id:
        conditions.append("user_id = ?")
        params.append(user_id)

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    print("🛠️ SQL:", query)
    print("📦 Params:", params)

    try:
        conn = sqlite3.connect("quiz.db")
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()

        results = [
            {"id": row[0], "title": row[1], "description": row[2]}
            for row in rows
        ]

        if not results:
            print("🔍 Aucun résultat trouvé, récupération de tous les quiz...")

            cursor.execute("SELECT id, title, description FROM quizzes")
            rows = cursor.fetchall()
            traiter = []

            for row in rows:
                quiz_id, title, description = row

                cursor.execute("SELECT id, question FROM questions WHERE quiz_id = ?", (quiz_id,))
                questions = cursor.fetchall()
                questions_formatted = [{"id": q[0], "question": q[1]} for q in questions]

                traiter.append({
                    "id": quiz_id,
                    "title": title,
                    "description": description,
                    "questions": questions_formatted
                })

            
            found_ids = set()
            for quiz in traiter:
                match = False
                if "titles" in filters and chercher_bert(search_text, quiz['title'], model_mr):
                    match = True
                elif "descriptions" in filters and chercher_bert(search_text, quiz['description'], model_mr):
                    match = True
                elif "questions" in filters:
                    for question in quiz['questions']:
                        if chercher_bert(search_text, question['question'], model_mr):
                            match = True
                            break
                elif "all" in filters or not filters:
                    if (chercher_bert(search_text, quiz['title'], model_mr) or
                        chercher_bert(search_text, quiz['description'], model_mr) or
                        any(chercher_bert(search_text, q['question'], model_mr) for q in quiz['questions'])):
                        match = True

                if match and quiz['id'] not in found_ids:
                    results.append({
                        "id": quiz['id'],
                        "title": quiz['title'],
                        "description": quiz['description']
                    })
                    found_ids.add(quiz['id'])

            conn.close()
            return jsonify({"results": results})



    except Exception as e:
        print("❌ Erreur SQL:", e)
        return jsonify({"error": str(e)}), 500


    
    

@app.route('/api/unsplash/search', methods=['GET'])
def search_unsplash():
    query = request.args.get('query', '')
    if not query:
        return jsonify({"error": "Le paramètre 'query' est requis"}), 400

    try:
        response = requests.get(
            f"{UNSPLASH_API}/search/photos",
            params={
                "query": query,
                "per_page": 20,
                "orientation": "landscape"  # Meilleur pour les quiz
            },
            headers={"Authorization": f"Client-ID {UNSPLASH_KEY}"},
            timeout=5
        )
        response.raise_for_status()

        results = response.json()["results"]
        images = [{
            "id": img["id"],
            "urls": {
                "regular": img["urls"]["regular"],
                "thumb": img["urls"]["thumb"]
            },
            "user": {
                "name": img["user"]["name"],
                "profile": img["user"]["links"]["html"]
            }
        } for img in results]

        return jsonify({"images": images})

    except requests.RequestException as e:
        return jsonify({"error": f"Erreur Unsplash: {str(e)}"}), 500


@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "INSERT INTO users (username, password) VALUES (?, ?)", (username, password))
        conn.commit()
        return jsonify({"message": "User registered successfully"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Username already exists"}), 409
    finally:
        conn.close()


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, username, password FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    conn.close()

    if user and user['password'] == password:
        return jsonify({
            "message": "Login successful",
            "user": {
                "id": user['id'],
                "username": user['username']
            }
        }), 200
    else:
        return jsonify({"error": "Invalid credentials"}), 401


@app.route('/api/quizzes', methods=['GET'])
def get_quizzes():
    user_id = request.args.get('user_id')

    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    quizzes = get_quizzes_by_user(user_id)
    return jsonify({"quizzes": quizzes}), 200


@app.route('/api/quizzes/<int:quiz_id>', methods=['GET'])
def get_quiz(quiz_id):
    quiz = get_quiz_by_id(quiz_id)

    if not quiz:
        return jsonify({"error": "Quiz not found"}), 404

    return jsonify({"quiz": quiz}), 200


@app.route('/api/quizzes', methods=['POST'])
def add_quiz():
    data = request.json
    title = data.get('title')
    description = data.get('description', '')
    user_id = data.get('user_id')
    questions = data.get('questions', [])

    if not title or not user_id or not questions:
        return jsonify({"error": "Title, user ID, and questions are required"}), 400

    # Traitement des images
    for question in data.get('questions', []):
        if 'image' in question:
            if question['image']['source'] == 'unsplash':
                question['image_url'] = question['image']['urls']['regular']
                question['image_source'] = 'unsplash'
                question['unsplash_data'] = {
                    'id': question['image']['id'],
                    'urls': question['image']['urls'],
                    'user': question['image']['user']
                }
            elif question['image']['source'] == 'upload':
                question['image_url'] = question['image']['path']
                question['image_source'] = 'upload'

    quiz_id = create_quiz(title, description, user_id, questions)
    return jsonify({"message": "Quiz created successfully", "quiz_id": quiz_id}), 201


@app.route('/api/quizzes/<int:quiz_id>', methods=['PUT'])
def update_quiz_route(quiz_id):
    data = request.json
    title = data.get('title')
    description = data.get('description', '')
    questions = data.get('questions', [])

    if not title or not questions:
        return jsonify({"error": "Title and questions are required"}), 400

    success = update_quiz(quiz_id, title, description, questions)

    if success:
        return jsonify({"message": "Quiz updated successfully"}), 200
    else:
        return jsonify({"error": "Failed to update quiz"}), 500


@app.route('/api/quizzes/<int:quiz_id>', methods=['DELETE'])
def delete_quiz_route(quiz_id):
    success = delete_quiz(quiz_id)

    if success:
        return jsonify({"message": "Quiz deleted successfully"}), 200
    else:
        return jsonify({"error": "Failed to delete quiz"}), 500


@app.route('/api/rooms', methods=['POST'])
def create_room_route():
    data = request.json
    quiz_id = data.get('quiz_id')
    host_id = data.get('host_id')  # L'hôte doit être connecté

    if not quiz_id or not host_id:
        return jsonify({"error": "Quiz ID and host ID are required"}), 400

    # Vérifier que l'hôte est connecté (exemple simplifié)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username FROM users WHERE id = ?", (host_id,))
    host = cursor.fetchone()
    conn.close()

    if not host:
        return jsonify({"error": "Host not found or not logged in"}), 401

    # Créer la salle
    room = create_room(quiz_id, host_id)

    # Générer le QR code pour la salle
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(f"http://localhost:5173/join/{room['room_code']}")
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    # Convertir en base64 pour l'envoi au client
    buffered = io.BytesIO()
    img.save(buffered)
    qr_code = base64.b64encode(buffered.getvalue()).decode('utf-8')

    return jsonify({
        "message": "Room created successfully",
        "room": room,
        "qr_code": qr_code
    }), 201


@app.route('/api/rooms/<room_code>', methods=['GET'])
def get_room(room_code):
    room = get_room_by_code(room_code)

    if not room:
        return jsonify({"error": "Room not found"}), 404

    return jsonify({"room": room}), 200


@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard_route():
    limit = request.args.get('limit', 10, type=int)
    leaderboard = get_leaderboard(limit)

    return jsonify({"leaderboard": leaderboard}), 200

@app.route('/api/game_history', methods=['GET'])
def get_game_history():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Récupérer l'historique des parties où l'utilisateur est soit hôte soit participant
        cursor.execute('''
            SELECT g.id, g.quiz_id, g.room_code, g.created_at, q.title as quiz_title,
                   (SELECT COUNT(*) FROM game_players WHERE game_id = g.id) as player_count,
                   CASE WHEN g.host_id = ? THEN 'host' ELSE 'player' END as user_role
            FROM games g
            JOIN quizzes q ON g.quiz_id = q.id
            WHERE g.host_id = ? OR EXISTS (
                SELECT 1 FROM game_players gp 
                WHERE gp.game_id = g.id AND gp.user_id = ?
            )
            ORDER BY g.created_at DESC
        ''', (user_id, user_id, user_id))
        
        games = [dict(row) for row in cursor.fetchall()]
        
        return jsonify({"games": games})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/game_details/<int:game_id>', methods=['GET'])
def get_game_details(game_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Détails de base de la partie
        cursor.execute('''
            SELECT g.*, q.title as quiz_title, u.username as host_name
            FROM games g
            JOIN quizzes q ON g.quiz_id = q.id
            JOIN users u ON g.host_id = u.id
            WHERE g.id = ?
        ''', (game_id,))
        game = cursor.fetchone()
        if not game:
            return jsonify({"error": "Game not found"}), 404
        game = dict(game)

        # Joueurs et leurs scores
        cursor.execute('''
            SELECT u.username, gp.score
            FROM game_players gp
            JOIN users u ON gp.user_id = u.id
            WHERE gp.game_id = ?
            ORDER BY gp.score DESC
        ''', (game_id,))
        players = [dict(row) for row in cursor.fetchall()]

        # Questions du quiz
        cursor.execute('''
            SELECT q.id, q.question, q.type, q.correct_answer
            FROM questions q
            WHERE q.quiz_id = ?
        ''', (game['quiz_id'],))
        questions = [dict(row) for row in cursor.fetchall()]

        # Statistiques des réponses
        for question in questions:
            cursor.execute('''
                SELECT COUNT(*) as total_answers,
                       SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) as correct_count
                FROM answers a
                WHERE a.game_id = ? AND a.question_id = ?
            ''', (game_id, question['id']))
            stats = cursor.fetchone()
            question.update(dict(stats))

        # Réponses ouvertes
        cursor.execute('''
            SELECT a.question_id, u.username, a.answer_text, a.is_correct
            FROM answers a
            JOIN users u ON a.user_id = u.id
            JOIN questions q ON a.question_id = q.id
            WHERE a.game_id = ? AND q.type = 'open_question'
        ''', (game_id,))
        open_answers = [dict(row) for row in cursor.fetchall()]

        return jsonify({
            "game": game,
            "players": players,
            "questions": questions,
            "open_answers": open_answers
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def send_question(room_code):
    room = active_rooms[room_code]
    current_q = room['current_question']
    question = room['questions'][current_q]

    print(f"[DEBUG] Sending question {current_q + 1} to room {room_code}")

    # Récupérer les métadonnées Unsplash si besoin
    unsplash_data = None
    if question.get('image_source') == 'unsplash':
        conn = get_db_connection()
        unsplash_data = conn.execute('''
        SELECT regular_url, thumb_url, author_name, author_url 
        FROM unsplash_photos 
        WHERE question_id = ?
        ''', (question['id'],)).fetchone()
        conn.close()

    # Réinitialiser les réponses ouvertes pour cette question
    if 'open_answers' in room:
        room['open_answers'][current_q] = []  # Utiliser current_q comme clé

    # Préparer les options en fonction du type de question
    options = None
    if question['type'] == 'true_false':
        options = ['Vrai', 'Faux']
    elif question['type'] == 'qcm':
        options = [
            question.get('option_a'),
            question.get('option_b'),
            question.get('option_c'),
            question.get('option_d')
        ]

     # Préparer l'objet image pour l'envoi
    image_data = None
    if question.get('image_url'):
        image_data = {
            'url': question['image_url'],
            'source': question.get('image_source', 'none'),
            'unsplash_data': dict(unsplash_data) if unsplash_data else None
        }
  
    # Envoyer la question à tous les joueurs
    socketio.emit('new_question', {
        'question_number': current_q + 1,
        'total_questions': len(room['questions']),
        'question': question['question'],
        'type': question['type'],
        'image': image_data,
        'options': options,
        'time_limit': question.get('time_limit', 15)
    }, room=room_code)

    # Démarrer un timer pour la question (mais ne pas passer automatiquement à la suivante)
    def start_timer(room_code, time_limit):
        print(
            f"[DEBUG] Starting timer for question {current_q + 1} in room {room_code}")
        socketio.sleep(time_limit)
        print(
            f"[DEBUG] Timer expired for question {current_q + 1} in room {room_code}")
        # Juste notifier que le temps est écoulé
        socketio.emit('time_up', to=room_code)

    if room_code in timers:
        timers[room_code].join()  # Arrêter le timer précédent s'il existe

    timers[room_code] = socketio.start_background_task(
        start_timer, room_code, question.get('time_limit', 15))


# Socket events
@socketio.on('connect')
def handle_connect():
    print('Client connected')


@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')
    user_id = request.sid
    if user_id in user_rooms:
        room_id = user_rooms[user_id]
        leave_room(room_id)
        if room_id in active_rooms:
            active_rooms[room_id]['players'].pop(user_id, None)
            emit('player_left', {'user_id': user_id}, to=room_id)

            # If room is empty, remove it
            if not active_rooms[room_id]['players']:
                active_rooms.pop(room_id, None)
        user_rooms.pop(user_id, None)


user_sessions = {}  # Associe request.sid à username


@socketio.on('create_room')
def handle_create_room(data):
    user_id = request.sid
    username = data.get('username')
    quiz_id = data.get('quiz_id')
    room_code = data.get('room_code')

    # Vérifier que l'hôte est connecté (exemple simplifié)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
    host = cursor.fetchone()
    conn.close()

    if not host:
        emit('error', {'message': 'Host not logged in'})
        return

    # Obtenir les détails du quiz
    quiz = get_quiz_by_id(quiz_id)
    if not quiz:
        emit('error', {'message': 'Quiz not found'})
        return

    join_room(room_code)
    user_rooms[user_id] = room_code
    user_sessions[user_id] = username  # Ajouter l'hôte à user_sessions

    # Créer la salle sans ajouter l'hôte à la liste des joueurs
    active_rooms[room_code] = {
        'host': username,  # Stocker l'hôte séparément
        'host_id': str(user_id),
        'quiz_id': quiz_id,
        'players': {},  # Liste des joueurs (sans l'hôte)
        'questions': quiz['questions'],
        'current_question': 0,
        'state': 'waiting',
        'start_time': None
    }

    print(f"[DEBUG] Room created. Host ID: {user_id} (type: {type(user_id)})")
    print(
        f"[DEBUG] Initial players dict: {active_rooms[room_code]['players']}")

    emit('room_created', {'room_code': room_code, 'is_host': True})
    emit('player_joined', {'players': []},
         to=room_code)  # Aucun joueur au départ


@socketio.on('join_room')
def handle_join_room(data):
    user_id = request.sid
    username = data.get('username')  # Pseudo du joueur
    room_code = data.get('room_code')

    print(
        f"[DEBUG] User {username} (ID: {user_id}) is trying to join room {room_code}")

    if room_code not in active_rooms:
        room = get_room_by_code(room_code)
        if not room:
            emit('error', {'message': 'Room not found'})
            return
        emit(
            'error', {'message': 'Room exists but host has not started the session yet'})
        return

    if active_rooms[room_code]['state'] != 'waiting':
        emit('error', {'message': 'Game already in progress'})
        return

    join_room(room_code)
    user_rooms[user_id] = room_code
    user_sessions[user_id] = username  # Ajouter le joueur à user_sessions

    # Ajouter le joueur à la liste des joueurs
    active_rooms[room_code]['players'][user_id] = {
        'username': username,
        'score': 0,
        'answers': {}
    }

    # Exclure l'hôte de la liste des joueurs
    players_list = [
        {'id': pid, 'username': player['username'], 'score': player['score']}
        for pid, player in active_rooms[room_code]['players'].items()
        # Exclure l'hôte
        if player['username'] != active_rooms[room_code]['host']
    ]

    emit('player_joined', {'players': players_list},
         to=room_code)  # Envoyer à tous dans la salle


@socketio.on('start_game')
def handle_start_game(data):
    user_id = request.sid
    room_code = user_rooms.get(user_id)

    if not room_code or room_code not in active_rooms:
        emit('error', {'message': 'Room not found'})
        return

    username = user_sessions.get(user_id)
    if not username:
        emit('error', {'message': 'User not found in session'})
        return

    if active_rooms[room_code]['host'] != username:
        emit('error', {'message': 'Only the host can start the game'})
        return

    active_rooms[room_code]['state'] = 'playing'
    active_rooms[room_code]['start_time'] = datetime.now().timestamp()
    # Commencer à la première question
    active_rooms[room_code]['current_question'] = 0

    # Émettez l'événement game_started
    emit('game_started', to=room_code)

    # Send the first question
    send_question(room_code)


@socketio.on('submit_answer')
def handle_submit_answer(data):
    user_id = request.sid
    room_code = user_rooms.get(user_id)
    answer = data.get('answer')

    if not room_code or room_code not in active_rooms:
        emit('error', {'message': 'Room not found'})
        return

    room = active_rooms[room_code]
    if room['state'] != 'playing':
        emit('error', {'message': 'Game not in progress'})
        return

    if hasattr(room, 'time_elapsed') and room.time_elapsed:
        emit('error', {'message': 'Time has elapsed, cannot submit answer'})
        return

    current_q = room['current_question']
    question = room['questions'][current_q]

    # Enregistrer la réponse
    room['players'][user_id]['answers'][current_q] = answer

    # Préparer les options en fonction du type de question
    if question['type'] == 'true_false':
        options = ['Vrai', 'Faux']
    else:
        options = [question['option_a'], question['option_b'],
                   question['option_c'], question['option_d']]

    # Vérifier si la réponse est correcte
    is_correct = options[answer] == question['correct_answer']
    points = question.get('points', 10) if is_correct else 0

    if is_correct:
        room['players'][user_id]['score'] += points

    # Envoyer le résultat au joueur
    emit('answer_result', {
        'is_correct': is_correct,
        'correct_answer': question['correct_answer'],
        'points': points,
        'new_score': room['players'][user_id]['score']
    }, to=user_id)

    # Envoyer tous les scores à l'hôte
    players_list = [
        {'id': pid, 'username': player['username'], 'score': player['score']}
        for pid, player in room['players'].items()
        if str(pid) != str(room['host_id'])
    ]

    emit('update_scores', {'players': players_list}, to=room_code)


@socketio.on('next_question')
def handle_next_question(data):
    user_id = request.sid
    room_code = user_rooms.get(user_id)

    if not room_code or room_code not in active_rooms:
        emit('error', {'message': 'Room not found'})
        return

    username = user_sessions.get(user_id)
    if not username:
        emit('error', {'message': 'User not found in session'})
        return

    if active_rooms[room_code]['host'] != username:
        emit('error', {'message': 'Only the host can advance questions'})
        return

    room = active_rooms[room_code]
    current_q = room['current_question']

    # Submit automatic answers for players who didn't answer
    for player_id, player in room['players'].items():
        if current_q not in player['answers']:
            player['answers'][current_q] = -1  # Indicate no answer

    # Move to next question or end game
    room['current_question'] += 1

    if room['current_question'] < len(room['questions']):
        send_question(room_code)
    else:
        # End game
        room['state'] = 'finished'

        # Enregistrer la partie dans la base de données
        conn = get_db_connection()
        cursor = conn.cursor()

        try:
            # Créer l'entrée de jeu
            cursor.execute('''
                INSERT INTO games (quiz_id, room_code, host_id)
                VALUES (?, ?, (SELECT id FROM users WHERE username = ?))
            ''', (room['quiz_id'], room_code, room['host']))
            game_id = cursor.lastrowid

            # Enregistrer les joueurs et leurs réponses
            for pid, player in room['players'].items():
                # Trouver l'ID utilisateur
                cursor.execute('SELECT id FROM users WHERE username = ?', (player['username'],))
                user_result = cursor.fetchone()
                if user_result:
                    db_user_id = user_result['id']
                    
                    # Enregistrer le joueur dans game_players
                    cursor.execute('''
                        INSERT INTO game_players (game_id, user_id, score)
                        VALUES (?, ?, ?)
                    ''', (game_id, db_user_id, player['score']))
                    
                    # Enregistrer les réponses
                    for q_idx, answer in player['answers'].items():
                        question = room['questions'][q_idx]
                        is_correct = False
                        
                        if question['type'] != 'open_question' and answer != -1:
                            options = []
                            if question['type'] == 'true_false':
                                options = ['Vrai', 'Faux']
                            else:
                                options = [
                                    question.get('option_a'),
                                    question.get('option_b'),
                                    question.get('option_c'),
                                    question.get('option_d')
                                ]
                            is_correct = (options[answer] == question['correct_answer'])
                        
                        cursor.execute('''
                            INSERT INTO answers (game_id, question_id, user_id, answer_text, is_correct)
                            VALUES (?, ?, ?, ?, ?)
                        ''', (
                            game_id,
                            question['id'],
                            db_user_id,
                            str(answer) if answer != -1 else 'No answer',
                            is_correct
                        ))

            conn.commit()
            
            # Envoyer l'ID de la partie aux clients
            players_list = [
                {'id': pid, 'username': player['username'], 'score': player['score']}
                for pid, player in room['players'].items()
            ]
            socketio.emit('game_over', {
                'players': players_list, 
                'quiz_id': room['quiz_id'],
                'game_id': game_id  # Ajout de l'ID de la partie
            }, to=room_code)

        except Exception as e:
            conn.rollback()
            print(f"Error saving game results: {str(e)}")
        finally:
            conn.close()

        # Clean up
        if room_code in timers:
            del timers[room_code]

@socketio.on('submit_open_answer')
def handle_submit_open_answer(data):
    user_id = request.sid
    room_code = user_rooms.get(user_id)

    if not room_code or room_code not in active_rooms:
        return

    room = active_rooms[room_code]
    current_q = room['current_question']  # Utiliser toujours current_question

    # Initialisation du stockage des réponses
    if 'open_answers' not in room:
        room['open_answers'] = {}
    if current_q not in room['open_answers']:
        room['open_answers'][current_q] = []

    # Enregistrement de la réponse
    answer_data = {
        'username': user_sessions.get(user_id, "Anonymous"),
        'answer': data.get('answer_text', '').strip(),
        'timestamp': datetime.now().timestamp()
    }

    room['open_answers'][current_q].append(answer_data)

    # Envoyer à toute la room
    emit('new_open_answer', {
        'username': answer_data['username'],
        'answer': answer_data['answer'],
        'question_index': current_q,  # Envoyer l'index actuel
        'timestamp': answer_data['timestamp']
    }, room=room_code)


@socketio.on('get_player_answers')
def handle_get_player_answers(data):
    room_code = data.get('room_code')
    if not room_code or room_code not in active_rooms:
        return

    room = active_rooms[room_code]
    current_q = room['current_question']
    answers = {}

    for player_id, player in room['players'].items():
        if current_q in player['answers']:
            answers[player_id] = {
                'username': player['username'],
                'answer': player['answers'][current_q]
            }

    emit('player_answers', {'answers': answers}, room=room_code)


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)