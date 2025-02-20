from flask import Flask, render_template, url_for, flash, redirect,session,request
from forms import RegistrationForm, LoginForm,UpdateAccount, NewQuestionForm,EditPostForm,TitreQuiz,Pseudo_PinForm
from flask_session import Session
import sqlite3
import os ,sys
from werkzeug.utils import secure_filename
from datetime import date
from flask_socketio import join_room, leave_room, send, SocketIO
import random
from string import ascii_uppercase



app = Flask(__name__)
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SECRET_KEY']  = '5791628bb0b13ce0c676dfde28nha245'
PERMANENT_SESSION_LIFETIME = 1800
app.config.update(SECRET_KEY=os.urandom(24))
app.config['UPLOAD_FOLDER'] = 'uploads'
DEFAULT_PROFILE_IMAGE = 'smiley.jpg'

Session(app)
socketio = SocketIO(app, async_mode="gevent",cors_allowed_origins="*")

rooms={}
def generate_unique_code(length):
    while True:
        code = ""
        for _ in range(length):
            code += random.choice(ascii_uppercase)
        
        if code not in rooms:
            break
    
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

    titre = session.get('titre_quiz', "")  
    quiz_id = session.get('quiz_id', None)

    if titre_form.validate_on_submit():
        titre = titre_form.titre.data.strip()
        session['titre_quiz'] = titre

        # Récupérer l'ID utilisateur
        with sqlite3.connect("kahoot_clone.db") as con:
            cur = con.cursor()
            cur.execute('SELECT id_user FROM user WHERE adresse_mail=?', (session['adresse_mail'],))
            user_id = cur.fetchone()
            
            if user_id:
                user_id = user_id[0]
                cur.execute('INSERT INTO quiz (id_user, nom) VALUES (?, ?)', (user_id, titre))
                con.commit()

                cur.execute('SELECT id_quiz FROM quiz WHERE nom = ? AND id_user = ?', (titre, user_id))
                quiz_id = cur.fetchone()[0]
                session['quiz_id'] = quiz_id

                flash(f'Quiz "{titre}" créé avec succès !', 'success')

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

        
      
@app.route("/join", methods=["POST", "GET"])
def join():
    session.clear()
    if request.method == "POST":
        name = request.form.get("name")
        code = request.form.get("code")
        join = request.form.get("join", False)
        print("Salle demandée :", code) 

        if not name:
            return render_template("join.html", error="Please enter a name.", code=code, name=name)

        if join and not code:
            return render_template("join.html", error="Please enter a room code.", code=code, name=name)

        room = code

        if code not in rooms:
            return render_template("join.html", error="Room does not exist.", code=code, name=name)

        session["name"] = name
        session["room"] = code
        print(f"Utilisateur {name} rejoint la salle {session['room']}")
        if name in rooms[room]["users"]:
            return redirect(url_for('cnx_reussie',name=name))
        rooms[room]["users"].append(name)
        if name in rooms[room]['users']:
            print("le pseudo est :                     ",name)
            return redirect(url_for('cnx_reussie',name=name))




    return render_template("join.html")


    
@app.route("/room")
def room():
    room = session.get("room")

    return render_template("room.html", code=room, users=rooms[room]["users"])








@app.route("/create_room/<int:quiz_id>", methods=["GET","POST"])
def create_room(quiz_id):

    room = generate_unique_code(5)
    rooms[room] = {"members": 0, "messages": [], "users": []}  

    # rooms[room] = {"members": 0, "messages": []}
    print("Room créée :", room, rooms)
    session["room"] = room
    if room:
        return redirect(url_for("room"))
    return render_template("create_room.html",room=session['room'])
    


@socketio.on("message")
def message(data):
    room = session.get("room")
    if room not in rooms:
        return 
    
    content = {
        "name": session.get("name"),
        "message": data["data"]
    }
    send(content, to=room)
    rooms[room]["messages"].append(content)
    print(f"{session.get('name')} said: {data['data']}")

@socketio.on("connect")
def connect(auth):
    room = session.get("room")
    name = session.get("name")
    print(f"Tentative de connexion WebSocket: {name} dans {room}")
    if not room or not name:
        return
    if room not in rooms:
        leave_room(room)
        return
    
    join_room(room)
    send({"name": name, "message": "has entered the room"}, to=room)

    rooms[room]["members"] += 1
    if "users" not in rooms[room]:
        rooms[room]["users"] = []
    rooms[room]["users"].append(name) 

    print(f"{name} joined room {room}")
@socketio.on("join_room")
def handle_join(data):
    room = data["room"]
    name = data["name"]
    
    print(f"🔥 WebSocket: {name} rejoint {room}")  # Debugging

    if room not in rooms:
        return
    
    join_room(room)
    
    rooms[room]["members"] += 1
    rooms[room]["users"].append(name)

    print(f"✅ {name} ajouté à {room}. Utilisateurs: {rooms[room]['users']}, Membres: {rooms[room]['members']}")

    emit("update_users", {"users": rooms[room]["users"], "members": rooms[room]["members"]}, room=room)


@socketio.on("disconnect")
def disconnect():
    room = session.get("room")
    name = session.get("name")
    leave_room(room)

    if room in rooms:
        rooms[room]["members"] -= 1
        if name in rooms[room]["users"]:
            rooms[room]["users"].remove(name)  # Retirer l'utilisateur de la liste

        if rooms[room]["members"] <= 0:
            del rooms[room]
    
    send({"name": name, "message": "has left the room"}, to=room)
    print(f"{name} has left the room {room}")
    




if __name__ == '__main__':
    app.run(debug=True)