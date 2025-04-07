from flask import Flask, request, jsonify, session
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import json
import time
from datetime import datetime
import qrcode
import io
import base64
from threading import Timer
from db import (
    init_db, get_quizzes_by_user, get_quiz_by_id, create_quiz, update_quiz,
    delete_quiz, create_room, get_room_by_code, save_score, get_leaderboard,
    get_db_connection
)

# Initialize Flask app

app = Flask(__name__)
app.secret_key = 'quiz_app_secret_key'  # Change this in production
CORS(app, supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="*")

# Initialize database
init_db()

# Active quiz rooms
active_rooms = {}
user_rooms = {}
timers = {}  # Pour stocker les timers de chaque room

# Routes


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


def send_question(room_code):
    room = active_rooms[room_code]
    current_q = room['current_question']
    question = room['questions'][current_q]

    print(f"[DEBUG] Sending question {current_q + 1} to room {room_code}")

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

    # Envoyer la question à tous les joueurs
    socketio.emit('new_question', {
        'question_number': current_q + 1,
        'total_questions': len(room['questions']),
        'question': question['question'],
        'options': options,
        'time_limit': question.get('time_limit', 15),
        'start_time': datetime.now().timestamp(),
        'type': question['type']
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
        'host_id': user_id,
        'quiz_id': quiz_id,
        'players': {},  # Liste des joueurs (sans l'hôte)
        'questions': quiz['questions'],
        'current_question': 0,
        'state': 'waiting',
        'start_time': None
    }

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
        print(
            f"[DEBUG] Sending next question ({room['current_question'] + 1}) to room {room_code}")
        send_question(room_code)
    else:
        print(f"[DEBUG] Ending game in room {room_code}")
        # End game
        room['state'] = 'finished'

        # Save scores to database
        for pid, player in room['players'].items():
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id FROM users WHERE username = ?", (player['username'],))
            user_result = cursor.fetchone()
            if user_result:
                db_user_id = user_result['id']
                save_score(db_user_id, room['quiz_id'], player['score'])
            conn.close()

        # Send final results
        players_list = [
            {'id': pid, 'username': player['username'],
                'score': player['score']}
            for pid, player in room['players'].items()
        ]
        socketio.emit('game_over', {
                      'players': players_list, 'quiz_id': room['quiz_id']}, to=room_code)

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


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
