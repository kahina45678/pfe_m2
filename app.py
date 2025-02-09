from flask import Flask, render_template, url_for, flash, redirect,session,request
from forms import RegistrationForm, LoginForm,UpdateAccount, NewQuestionForm,EditPostForm,TitreQuiz
from flask_session import Session
import sqlite3
import os ,sys
from werkzeug.utils import secure_filename
from datetime import date



app = Flask(__name__)
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SECRET_KEY']  = '5791628bb0b13ce0c676dfde28nha245'
PERMANENT_SESSION_LIFETIME = 1800
app.config.update(SECRET_KEY=os.urandom(24))
app.config['UPLOAD_FOLDER'] = 'uploads'
DEFAULT_PROFILE_IMAGE = 'smiley.jpg'

Session(app)


@app.route("/")
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
            SELECT quiz.id_quiz, quiz.nom, quiz.date_creation, user.nom, user.prenom, user.adresse_mail
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

    MAX_QUESTIONS = 40  # Limite à 40 questions

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
def edit_post(post_id):
    form = EditPostForm()
    

    if session['logged_in']==False:
        flash('Vous devez être connecté pour modifier un post.', 'danger')
        return redirect(url_for('login'))
    

    with sqlite3.connect("kahoot_clone.db") as con:
        cur = con.cursor()
        cur.execute("SELECT * FROM post WHERE id = ?", (post_id,))
        post = cur.fetchone()

        if post is None :
            flash('Vous n\'êtes pas autorisé à modifier ce post.', 'danger')
            return redirect(url_for('home'))

    if form.validate_on_submit():
       
        with sqlite3.connect("kahoot_clone.db") as con:
            cur = con.cursor()
            cur.execute("UPDATE post SET title = ?, text = ? WHERE id = ?", (form.title.data, form.text.data, post_id))
            con.commit()
            flash('Le post a été modifié avec succès.', 'success')
            return redirect(url_for('home'))



    return render_template('edit_post.html', form=form, post=post)


@app.route("/delete_post/<int:quiz_id>", methods=['GET', 'POST'])
def delete_post(post_id):

    with sqlite3.connect("kahoot_clone.db") as con:
        cur = con.cursor()
        cur.execute("SELECT * FROM post WHERE id = ?", (post_id,))
        post = cur.fetchone()

        if post is None:
            flash('Vous n\'êtes pas autorisé à supprimer ce post.', 'danger')
            return redirect(url_for('home'))
    con.close()

    with sqlite3.connect("kahoot_clone.db") as con:
        cur = con.cursor()
        cur.execute("DELETE FROM post WHERE id = ?", (post_id,))
        con.commit()
        flash('Le post a été supprimé avec succès.', 'success')
    con.close()

    return redirect(url_for('home'))




if __name__ == '__main__':
    app.run(debug=True)
