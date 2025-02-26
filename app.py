from gevent import monkey
monkey.patch_all()
from gevent.pywsgi import WSGIServer
from geventwebsocket.handler import WebSocketHandler



from flask import Flask, render_template, url_for, flash, redirect,session,request,jsonify
from forms import RegistrationForm, LoginForm,UpdateAccount, NewQuestionForm,EditPostForm,TitreQuiz,Pseudo_PinForm
from flask_session import Session
import sqlite3
import os ,sys
from werkzeug.utils import secure_filename
from datetime import date
from flask_socketio import join_room, leave_room, send, SocketIO,emit
import random
from string import ascii_uppercase
import numpy as np
import time



app = Flask(__name__)
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SECRET_KEY']  = '5791628bb0b13ce0c676dfde28nha245'
PERMANENT_SESSION_LIFETIME = 1800
app.config.update(SECRET_KEY=os.urandom(24))
app.config['UPLOAD_FOLDER'] = 'uploads'
DEFAULT_PROFILE_IMAGE = 'smiley.jpg'
TEMPS_QUESTION=30
DEBUT=False
Session(app)
socketio = SocketIO(app, async_mode="gevent",cors_allowed_origins="*")



def generate_unique_code(length=5):
    characters = list(ascii_uppercase)
    code = ''.join(np.random.choice(characters, length))
    return code

@app.route("/")
@app.route("/base")
def base():
    
    return render_template('base.html')





@app.route("/home")
def home():
    if 'logged_in' not in session or not session['logged_in']:
        flash("Vous devez être connecté pour voir vos quiz.", "danger")
        return redirect(url_for('login'))
    
    print("Session actuelle :", session)  

    quizzes = []
    with sqlite3.connect("kahoot_clone.db") as con:
        cur = con.cursor()
        cur.execute('SELECT id_user FROM user WHERE adresse_mail=?', (session['adresse_mail'],))
        user_id = cur.fetchone()
            
    if user_id:
        user_id = user_id[0]
        
        con.commit()
    # user_id = session.get('user_id')  

    if not user_id:
        flash("Erreur : utilisateur non trouvé.", "danger")
        return redirect(url_for('login'))  

    with sqlite3.connect("kahoot_clone.db") as con:
        cur = con.cursor()
        cur.execute("""
            SELECT DISTINCT quiz.id_quiz, quiz.nom, quiz.date_creation, user.nom, user.prenom, user.adresse_mail
            FROM quiz
            INNER JOIN user ON quiz.id_user = user.id_user
            WHERE quiz.id_user = ?
        """, (user_id,))
        
        rows = cur.fetchall()
        print("Quizzes récupérés :", rows) 

        for row in rows:
            quiz = {
                'id_quiz': row[0],
                'nom': row[1],
                'date_creation': row[2],
                'author_nom': row[3],
                'author_prenom': row[4],
                'adresse_mail': row[5]
            }
            quizzes.append(quiz)
        
    return render_template('home.html', quizzes=quizzes, user_id=user_id)




@app.route("/register", methods=['GET', 'POST'])
def register():
    form = RegistrationForm()
    if form.validate_on_submit():
        
        with sqlite3.connect("kahoot_clone.db") as con:
            cur = con.cursor()
            
            cur.execute('INSERT INTO user (nom,prenom, adresse_mail, mot_de_passe,date_inscription) VALUES (?,?, ?, ?,?)', (form.nom.data,form.prenom.data, form.adresse_mail.data, form.password.data,date.today()))
            con.commit
            flash(f'Account created for {form.adresse_mail.data}!', 'success')
        con.close()
        session['logged_in']=True
        
        session['adresse_mail'] = form.adresse_mail.data

        return redirect(url_for('home'))
    return render_template('register.html', title='Register', form=form)


@app.route("/login", methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        with sqlite3.connect("kahoot_clone.db") as con:
            cur = con.cursor()
            cur.execute('SELECT mot_de_passe FROM user WHERE adresse_mail = ?', (form.adresse_mail.data,))
            result = cur.fetchone() 
            if result is not None:
                db_password = result[0]  
                if form.password.data == db_password:
                    flash('You have been logged in!', 'success')
                    
                    session['logged_in'] = True
                    session['adresse_mail'] = form.adresse_mail.data
                    with sqlite3.connect("kahoot_clone.db") as con:
                        cur = con.cursor()
                        
                        cur.execute('SELECT id_user from user where adresse_mail=?',(form.adresse_mail.data,))
                        result=cur.fetchone()
                        id_user=result[0]
                        
                    con.close()
                    
                    return redirect(url_for('home'))
                else:
                    flash('Invalid adresse_mail or password', 'danger')
            else:
                flash('Invalid adresse_mail or password', 'danger')

    return render_template('login.html', title='Login', form=form)






@app.route("/account", methods=['GET', 'POST'])
def account():


    form = UpdateAccount()
    pdp='smiley.jpg'
    
    if session['logged_in'] :
        user_adresse_mail = session['adresse_mail']
        with sqlite3.connect("kahoot_clone.db") as con:
            cur = con.cursor()
            
            if form.validate_on_submit():
                if form.pdp.data:
                    pdp = form.pdp.data
                    pdp.save(os.path.join(app.config['UPLOAD_FOLDER'], pdp))
                    cur.execute("UPDATE user SET pdp = ? WHERE adresse_mail = ?", (os.path.join(app.config['UPLOAD_FOLDER'], pdp), user_adresse_mail))
                    con.commit()
                    flash('Your profile picture has been updated!', 'success')
                
                if form.username.data != session['username']:
                    cur.execute("UPDATE user SET username = ? WHERE adresse_mail = ?", (form.username.data, user_adresse_mail))
                    con.commit()
                    session['username'] = form.username.data
                    flash('Your username has been updated!', 'success')
                
                # Récupérer le chemin de la photo de profil depuis la base de données
                cur.execute("SELECT pdp FROM user WHERE adresse_mail = ?", (user_adresse_mail,))
                pdp = cur.fetchone()[0] if cur.fetchone() else None
                
                
                if not pdp:
                    pdp = DEFAULT_PROFILE_IMAGE
    else:
        return redirect(url_for('login'))
    
    return render_template('account.html', form=form, pdp=pdp)





@app.route("/newPost", methods=['GET', 'POST'])
def newPost():
    if 'logged_in' not in session or not session['logged_in']:
        flash('Vous devez être connecté pour créer un quiz.', 'danger')
        return redirect(url_for('login'))

    if 'adresse_mail' not in session:
        flash('Erreur de session, veuillez vous reconnecter.', 'danger')
        return redirect(url_for('login'))
    
    form = NewQuestionForm()
    titre_form = TitreQuiz()

    MAX_QUESTIONS = 40 

    if 'questions' not in session or len(session['questions']) < MAX_QUESTIONS:
        session['questions'] = [{"question": "", "type_question": "", "reponse_1": "", "reponse_2": "",
                                 "reponse_3": "", "reponse_4": "", "bonne_reponse": "", "compte_double": False} for _ in range(MAX_QUESTIONS)]
    
    if 'cpt' not in session:
        session['cpt'] = 0  

    if 'quiz_created' not in session:
        session['quiz_created'] = False

    titre = session.get('titre_quiz', "")  
    quiz_id = session.get('quiz_id', None)

    if titre_form.validate_on_submit():
        titre = titre_form.titre.data.strip()
        session['titre_quiz'] = titre

        # Vérifier si le quiz a déjà été créé
        if not session.get('quiz_created', False):
            # Récupérer l'ID utilisateur
            with sqlite3.connect("kahoot_clone.db") as con:
                cur = con.cursor()
                cur.execute('SELECT id_user FROM user WHERE adresse_mail=?', (session['adresse_mail'],))
                user_id = cur.fetchone()
                
                if user_id:
                    user_id = user_id[0]

                    # Vérifier si un quiz avec le même nom existe déjà pour cet utilisateur
                    cur.execute('SELECT id_quiz FROM quiz WHERE nom = ? AND id_user = ?', (titre, user_id))
                    existing_quiz = cur.fetchone()

                    if existing_quiz:
                        flash(f'Un quiz avec le nom "{titre}" existe déjà.', 'danger')
                    else:
                        # Insérer le nouveau quiz
                        try:
                            cur.execute('INSERT INTO quiz (id_user, nom) VALUES (?, ?)', (user_id, titre))
                            con.commit()

                            # Récupérer l'ID du quiz nouvellement créé
                            cur.execute('SELECT id_quiz FROM quiz WHERE nom = ? AND id_user = ?', (titre, user_id))
                            quiz_id = cur.fetchone()[0]
                            session['quiz_id'] = quiz_id
                            session['quiz_created'] = True  # Marquer le quiz comme créé

                            flash(f'Quiz "{titre}" créé avec succès !', 'success')
                        except sqlite3.IntegrityError:
                            flash(f'Un quiz avec le nom "{titre}" existe déjà.', 'danger')

    if form.validate_on_submit():
        question_data = {
            "question": form.question.data or "",
            "type_question": form.type_question.data or "",
            "reponse_1": form.reponse_1.data or "",
            "reponse_2": form.reponse_2.data or "",
            "reponse_3": form.reponse_3.data or "",
            "reponse_4": form.reponse_4.data or "",
            "bonne_reponse": form.bonne_reponse.data or "",
            "compte_double": form.compte_double.data
        }

        session['questions'][session['cpt']] = question_data  

        if 'submit_next' in request.form and session['cpt'] < MAX_QUESTIONS - 1:
            session['cpt'] += 1
        elif 'submit_prev' in request.form and session['cpt'] > 0:
            session['cpt'] -= 1
        elif 'submit_validate' in request.form and quiz_id:
            with sqlite3.connect("kahoot_clone.db") as con:
                cur = con.cursor()

                for q in session['questions']:
                    if q["question"]:  
                        cur.execute('''
                            INSERT INTO qst (id_quiz, quest, type, rep1, rep2, rep3, rep4, bonne_rep, double)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (quiz_id, q["question"], q["type_question"], q["reponse_1"], q["reponse_2"], q["reponse_3"], q["reponse_4"], q["bonne_reponse"], q["compte_double"]))

                con.commit()

            flash(f'Quiz "{titre}" enregistré avec succès !', 'success')
            session.pop('questions', None)
            session.pop('cpt', None)
            session.pop('titre_quiz', None)
            session.pop('quiz_id', None)
            session.pop('quiz_created', None)  # Réinitialiser l'indicateur
            return redirect(url_for('home'))

        session.modified = True  

    question_actuelle = session['questions'][session['cpt']]
    
    return render_template('newPost.html', form=form, titre_form=titre_form, 
                           question_actuelle=question_actuelle, questions=session["questions"], cpt=session['cpt'])





    

@app.route("/logout")
def logout():
    session.clear() 
    flash('You have been logged out!', 'success')
    return redirect(url_for('home'))

@app.route("/about")
def about():
    return render_template('about.html', title='About')

@app.route("/edit_post/<int:quiz_id>", methods=['GET', 'POST'])
def edit_post(quiz_id):
    form = EditPostForm()
    

    if session['logged_in']==False:
        flash('Vous devez être connecté pour modifier un post.', 'danger')
        return redirect(url_for('login'))
    

    with sqlite3.connect("kahoot_clone.db") as con:
        cur = con.cursor()
        cur.execute("SELECT * FROM post WHERE id = ?", (quiz_id,))
        post = cur.fetchone()

        if post is None :
            flash('Vous n\'êtes pas autorisé à modifier ce post.', 'danger')
            return redirect(url_for('home'))

    if form.validate_on_submit():
       
        with sqlite3.connect("kahoot_clone.db") as con:
            cur = con.cursor()
            cur.execute("UPDATE post SET title = ?, text = ? WHERE id = ?", (form.title.data, form.text.data, quiz_id))
            con.commit()
            flash('Le post a été modifié avec succès.', 'success')
            return redirect(url_for('home'))



    return render_template('edit_post.html', form=form, post=post)


@app.route("/delete_post/<int:quiz_id>", methods=['GET', 'POST'])
def delete_post(quiz_id):

    with sqlite3.connect("kahoot_clone.db") as con:
        cur = con.cursor()
        cur.execute("SELECT * FROM quiz WHERE id_quiz = ?", (quiz_id,))
        post = cur.fetchone()

        if post is None:
            flash('Vous n\'êtes pas autorisé à supprimer ce post.', 'danger')
            return redirect(url_for('home'))
    con.close()

    with sqlite3.connect("kahoot_clone.db") as con:
        cur = con.cursor()
        cur.execute("DELETE FROM quiz WHERE id_quiz = ?", (quiz_id,))
        con.commit()
        flash('Le quiz a été supprimé avec succès.', 'success')
    con.close()

    return redirect(url_for('home'))


@app.route("/cnx_reussie/<name>")
def cnx_reussie(name):
    return render_template("cnx_reussie.html", name=name)

        
#pour permettre aux utilisateurs de rejoindre une room     
@app.route("/join", methods=["POST", "GET"])
def join():
    session.clear()
    if request.method == "POST":
        name = request.form.get("name")
        code = request.form.get("code")

        if not name:
            return render_template("join.html", error="Please enter a name.", code=code, name=name)

        if code:
            with sqlite3.connect("kahoot_clone.db") as con:
                cur = con.cursor()
                # Vérifiez si la room existe
                cur.execute('SELECT * FROM room WHERE id_room = ?', (code,))
                room_exists = cur.fetchone()

                if not room_exists:
                    return render_template("join.html", error="Room does not exist.", code=code, name=name)
                
                # # Vérifiez si le pseudo est déjà pris
                # cur.execute('''
                #         SELECT 1 
                #         FROM joueurs 
                #         WHERE pseudo = ? 
                #         AND id_room = ?
                #         LIMIT 1
                #     ''', (name, code))
                # pseudo_exists = cur.fetchone()

                # if pseudo_exists:
                #     return redirect(url_for('cnx_reussie', name=name))
                
               
                cur.execute('INSERT INTO joueurs (id_room, pseudo) VALUES (?, ?)', (code, name))
                con.commit()

                session["name"] = name
                session["room"] = code
                return redirect(url_for('cnx_reussie', name=name))

    return render_template("join.html")


    
@app.route("/room/<int:quiz_id>",methods=["POST", "GET"])
def room(quiz_id):
    room = session.get("room")
    users = []

    with sqlite3.connect("kahoot_clone.db") as con:
        cur = con.cursor()
        cur.execute('SELECT pseudo FROM joueurs WHERE id_room = ?', (room,))
        users = [row[0] for row in cur.fetchall()]
    socketio.emit('demarrer_quiz', {'quiz_id': quiz_id})


    return render_template("room.html", code=room, users=users, quiz_id=quiz_id)


    







@app.route("/create_room/<int:quiz_id>", methods=["GET", "POST"])
def create_room(quiz_id):
    room = generate_unique_code(5)
    date_creation = date.today().strftime("%Y-%m-%d")

    # Insérer la room dans la base de données
    with sqlite3.connect("kahoot_clone.db") as con:
        cur = con.cursor()
        cur.execute('INSERT INTO room (id_room, id_quiz, date_creation) VALUES (?, ?, ?)', 
                    (room, quiz_id, date_creation))
        con.commit()

    session["room"] = room
    return redirect(url_for("room", quiz_id=quiz_id))

    



@app.route('/affichage_h/<int:quiz_id>', methods=["GET", "POST"])
def affichage_h(quiz_id):
    # Récupérer les questions depuis la base de données
    liste_qst = []
    with sqlite3.connect("kahoot_clone.db") as con:
        cur = con.cursor()
        cur.execute("SELECT rep1,rep2,rep3,rep4,type,bonne_rep,quest FROM qst WHERE id_quiz = ?", (quiz_id,))
        questions = cur.fetchall()

        for question in questions:
            q = {
                'rep1': question[0],
                'rep2': question[1],
                'rep3': question[2],
                'rep4': question[3],
                'type': question[4],
                'bonne_rep': question[5],
                'quest': question[6]
            }
            liste_qst.append(q)

    # Initialisation du temps de début
    if 'temps_debut' not in session:
        session['temps_debut'] = time.time()

    # Calcul du temps écoulé
    temps_ecoule = time.time() - session['temps_debut']
    question_index = int(temps_ecoule // TEMPS_QUESTION)  # Index de la question à afficher

    # Vérifier si on a dépassé le nombre de questions
    if question_index >= len(liste_qst):
        session.pop('temps_debut', None)  # Réinitialiser pour un nouveau quiz
        return redirect(url_for('fin_quiz'))  # Redirection vers une page de fin de quiz

    # Temps restant pour la question en cours
    temps_restant = TEMPS_QUESTION - (temps_ecoule % TEMPS_QUESTION)

    # Rendre le template avec la question courante
    return render_template('affichage_h.html', 
                           question=liste_qst[question_index], 
                           temps_restant=int(temps_restant))


@app.route('/affichage_j/<int:quiz_id>', methods=["GET", "POST"])
def affichage_j(quiz_id):
    # Récupérer les questions depuis la base de données
    liste_qst = []
    with sqlite3.connect("kahoot_clone.db") as con:
        cur = con.cursor()
        cur.execute("SELECT rep1,rep2,rep3,rep4,type,bonne_rep,quest FROM qst WHERE id_quiz = ?", (quiz_id,))
        questions = cur.fetchall()

        for question in questions:
            q = {
                'rep1': question[0],
                'rep2': question[1],
                'rep3': question[2],
                'rep4': question[3],
                'type': question[4],
                'bonne_rep': question[5],
                'quest': question[6]
            }
            liste_qst.append(q)

    # Initialisation du temps de début
    if 'temps_debut' not in session:
        session['temps_debut'] = time.time()

    # Calcul du temps écoulé
    temps_ecoule = time.time() - session['temps_debut']
    question_index = int(temps_ecoule // TEMPS_QUESTION)  # Index de la question à afficher

    # Vérifier si on a dépassé le nombre de questions
    if question_index >= len(liste_qst):
        session.pop('temps_debut', None)  # Réinitialiser pour un nouveau quiz
        return redirect(url_for('fin_quiz'))  # Redirection vers une page de fin de quiz

    
    temps_restant = TEMPS_QUESTION - (temps_ecoule % TEMPS_QUESTION)

    # Rendre le template avec la question courante
    return render_template('affichage_j.html', 
                           question=liste_qst[question_index], 
                           temps_restant=int(temps_restant))

@app.route("/traiter_resultat", methods=["POST"])
def traiter_resultat():
    data = request.json
    est_correct = data.get("correct", False)

    if est_correct:
        return jsonify({"redirect_url": url_for("bonne_reponse")})
    else:
        return jsonify({"redirect_url": url_for("mauvaise_reponse")})

@app.route("/bonne_reponse")
def bonne_reponse():
    return render_template("bonne_reponse.html")  

@app.route("/mauvaise_reponse")
def mauvaise_reponse():
    return render_template("mauvaise_reponse.html")  


@app.route("/fin_quiz")
def fin_quiz():
    return render_template("fin_quiz.html") 



@socketio.on("connect")
def connect(auth):
    room = session.get("room")
    name = session.get("name")
    print(f"Tentative de connexion WebSocket: {name} dans {room}")

    if not room or not name:
        return

    with sqlite3.connect("kahoot_clone.db") as con:
        cur = con.cursor()
        
        # Vérifier si la room existe
        cur.execute('SELECT * FROM room WHERE id_room = ?', (room,))
        room_exists = cur.fetchone()

        if not room_exists:
            print(f"Room {room} n'existe pas.")
            return
        
        # Vérifier si l'utilisateur est bien dans la base de données
        cur.execute('SELECT * FROM joueurs WHERE id_room = ? AND pseudo = ?', (room, name))
        user_exists = cur.fetchone()

        if not user_exists:
            print(f"Utilisateur {name} non trouvé dans la room {room}.")
            return

    # Si tout est OK, on joint la room WebSocket
    join_room(room)
    send({"name": name, "message": "a rejoint la room"}, to=room)

    # ➡️ Émettre un événement pour mettre à jour la liste des utilisateurs
    with sqlite3.connect("kahoot_clone.db") as con:
        cur = con.cursor()
        cur.execute('SELECT pseudo FROM joueurs WHERE id_room = ?', (room,))
        users = [row[0] for row in cur.fetchall()]
        
    emit("update_users", {"users": users}, room=room)
    print(f"{name} a rejoint la room {room}")

@socketio.on("disconnect")
def disconnect():
    room = session.get("room")
    name = session.get("name")
    print(f"{name} tente de quitter la room {room}")

    if not room or not name:
        return

    with sqlite3.connect("kahoot_clone.db") as con:
        cur = con.cursor()

        # Supprimer l'utilisateur de la room
        cur.execute('DELETE FROM joueurs WHERE id_room = ? AND pseudo = ?', (room, name))
        con.commit()

        # Vérifier s'il reste des utilisateurs dans la room
        cur.execute('SELECT COUNT(*) FROM joueurs WHERE id_room = ?', (room,))
        members_count = cur.fetchone()[0]

        # Si plus personne dans la room, on peut la supprimer
        if members_count == 0:
            cur.execute('DELETE FROM room WHERE id_room = ?', (room,))
            con.commit()
            print(f"La room {room} a été supprimée car vide.")

    leave_room(room)
    send({"name": name, "message": "a quitté la room"}, to=room)

    # Mise à jour des utilisateurs restants dans la room
    with sqlite3.connect("kahoot_clone.db") as con:
        cur = con.cursor()
        cur.execute('SELECT pseudo FROM joueurs WHERE id_room = ?', (room,))
        users = [row[0] for row in cur.fetchall()]
        
    emit("update_users", {"users": users}, room=room)
    print(f"{name} a quitté la room {room}")

@socketio.on("onContinuer")
def on_continuer():
    room = session.get("room")
    print(f"📢 Le bouton 'Continuer' a été pressé dans la room {room}")

    if not room:
        print("❌ Pas de room associée à cette session")
        return
    
    # Récupère l'ID du quiz pour cette room
    with sqlite3.connect("kahoot_clone.db") as con:
        cur = con.cursor()
        cur.execute('SELECT id_quiz FROM room WHERE id_room = ?', (room,))
        quiz_id = cur.fetchone()
        
        if quiz_id:
            quiz_id = quiz_id[0]
            # 🔥 Diffuse l'événement start_questions à tous les utilisateurs de la room
            socketio.emit("start_questions", {"quiz_id": quiz_id}, room=room)
            print(f"🚀 Événement 'start_questions' émis pour le quiz {quiz_id} dans la room {room}")
        else:
            print("❌ Aucun quiz trouvé pour cette room")





if __name__ == '__main__':
    http_server = WSGIServer(('0.0.0.0', 5000), app, handler_class=WebSocketHandler)
    http_server.serve_forever()