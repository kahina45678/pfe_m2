from flask import Flask, render_template, url_for, flash, redirect,session,request
from forms import RegistrationForm, LoginForm,UpdateAccount, NewPost,EditPostForm
from flask_session import Session
import sqlite3
import os ,sys
from werkzeug.utils import secure_filename




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
    posts = []
    user_id = session.get('user_id')  
    with sqlite3.connect("bdd.db") as con:
        cur = con.cursor()
        cur.execute("""
            SELECT post.id, post.title, post.text, post.date, user.username,user.email
            FROM post
            INNER JOIN user ON post.user_id = user.id
            """)
        rows = cur.fetchall()
        for row in rows:
            post = {
                'id': row[0],
                'title': row[1],
                'text': row[2],
                'date': row[3],
                'author': row[4],
                'email':row[5]
            }
            
           
            posts.append(post)
        
    con.close()

    return render_template('home.html', posts=posts, user_id=user_id)




@app.route("/register", methods=['GET', 'POST'])
def register():
    form = RegistrationForm()
    if form.validate_on_submit():
        
        with sqlite3.connect("bdd.db") as con:
            cur = con.cursor()
            
            cur.execute('INSERT INTO user (username, email, password) VALUES (?, ?, ?)', (form.username.data, form.email.data, form.password.data))
            con.commit
            flash(f'Account created for {form.username.data}!', 'success')
        con.close()
        session['logged_in']=True
        session['username'] = form.username.data
        session['email'] = form.email.data

        return redirect(url_for('home'))
    return render_template('register.html', title='Register', form=form)


@app.route("/login", methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        with sqlite3.connect("bdd.db") as con:
            cur = con.cursor()
            cur.execute('SELECT password FROM user WHERE email = ?', (form.email.data,))
            result = cur.fetchone() 
            if result is not None:
                db_password = result[0]  
                if form.password.data == db_password:
                    flash('You have been logged in!', 'success')
                    session['logged_in'] = True
                    session['email'] = form.email.data
                    return redirect(url_for('home'))
                else:
                    flash('Invalid email or password', 'danger')
            else:
                flash('Invalid email or password', 'danger')

    return render_template('login.html', title='Login', form=form)






@app.route("/account", methods=['GET', 'POST'])
def account():


    form = UpdateAccount()
    pdp='smiley.jpg'
    
    if session['logged_in'] :
        user_email = session['email']
        with sqlite3.connect("bdd.db") as con:
            cur = con.cursor()
            
            if form.validate_on_submit():
                if form.pdp.data:
                    pdp = form.pdp.data
                    pdp.save(os.path.join(app.config['UPLOAD_FOLDER'], pdp))
                    cur.execute("UPDATE user SET pdp = ? WHERE email = ?", (os.path.join(app.config['UPLOAD_FOLDER'], pdp), user_email))
                    con.commit()
                    flash('Your profile picture has been updated!', 'success')
                
                if form.username.data != session['username']:
                    cur.execute("UPDATE user SET username = ? WHERE email = ?", (form.username.data, user_email))
                    con.commit()
                    session['username'] = form.username.data
                    flash('Your username has been updated!', 'success')
                
                # Récupérer le chemin de la photo de profil depuis la base de données
                cur.execute("SELECT pdp FROM user WHERE email = ?", (user_email,))
                pdp = cur.fetchone()[0] if cur.fetchone() else None
                
                
                if not pdp:
                    pdp = DEFAULT_PROFILE_IMAGE
    else:
        return redirect(url_for('login'))
    
    return render_template('account.html', form=form, pdp=pdp)


@app.route("/newPost",methods=['GET', 'POST'])
def newPost():
    form= NewPost()
    with sqlite3.connect('bdd.db') as con:
        cur=con.cursor()
        cur.execute('SELECT id FROM user WHERE email=?', (session['email'],))

        result = cur.fetchone() 
    con.close()
    
    if form.validate_on_submit():
        with sqlite3.connect("bdd.db") as con:
            cur = con.cursor()
            cur.execute('SELECT id FROM user WHERE email=?', (session['email'],))
            result = cur.fetchone()
            user_id = result[0]  
            cur.execute('INSERT INTO post (title, text, user_id) VALUES (?, ?, ?)', (form.title.data, form.text.data, user_id))
            flash('Post published!', 'success')
            con.commit()
        con.close()


    return render_template('newPost.html',form=form)

@app.route("/logout")
def logout():
    session.clear() 
    flash('You have been logged out!', 'success')
    return redirect(url_for('home'))

@app.route("/about")
def about():
    return render_template('about.html', title='About')

@app.route("/edit_post/<int:post_id>", methods=['GET', 'POST'])
def edit_post(post_id):
    form = EditPostForm()
    

    if session['logged_in']==False:
        flash('Vous devez être connecté pour modifier un post.', 'danger')
        return redirect(url_for('login'))
    

    with sqlite3.connect("bdd.db") as con:
        cur = con.cursor()
        cur.execute("SELECT * FROM post WHERE id = ?", (post_id,))
        post = cur.fetchone()

        if post is None :
            flash('Vous n\'êtes pas autorisé à modifier ce post.', 'danger')
            return redirect(url_for('home'))

    if form.validate_on_submit():
       
        with sqlite3.connect("bdd.db") as con:
            cur = con.cursor()
            cur.execute("UPDATE post SET title = ?, text = ? WHERE id = ?", (form.title.data, form.text.data, post_id))
            con.commit()
            flash('Le post a été modifié avec succès.', 'success')
            return redirect(url_for('home'))



    return render_template('edit_post.html', form=form, post=post)


@app.route("/delete_post/<int:post_id>", methods=['GET', 'POST'])
def delete_post(post_id):

    with sqlite3.connect("bdd.db") as con:
        cur = con.cursor()
        cur.execute("SELECT * FROM post WHERE id = ?", (post_id,))
        post = cur.fetchone()

        if post is None:
            flash('Vous n\'êtes pas autorisé à supprimer ce post.', 'danger')
            return redirect(url_for('home'))
    con.close()

    with sqlite3.connect("bdd.db") as con:
        cur = con.cursor()
        cur.execute("DELETE FROM post WHERE id = ?", (post_id,))
        con.commit()
        flash('Le post a été supprimé avec succès.', 'success')
    con.close()

    return redirect(url_for('home'))




if __name__ == '__main__':
    app.run(debug=True)
