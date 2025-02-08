from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, BooleanField ,FileField,TextAreaField
from wtforms.validators import DataRequired, Length, Email, EqualTo


class RegistrationForm(FlaskForm):
    username = StringField('Username',
                           validators=[DataRequired(), Length(min=2, max=20)])
    email = StringField('Email',
                        validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired()])
    confirm_password = PasswordField('Confirm Password',
                                     validators=[DataRequired(), EqualTo('password')])
    submit = SubmitField('Sign Up')


class LoginForm(FlaskForm):
    email = StringField('Email',
                        validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired()])
    remember = BooleanField('Remember Me')
    submit = SubmitField('Login')


class UpdateAccount(FlaskForm):
        username = StringField('Username',
                        validators=[DataRequired(), Length(min=2, max=20)])
        password = PasswordField('Password', validators=[DataRequired()])
        pdp = FileField('Profile Picture') 

        submit = SubmitField('update')
        





class NewPost(FlaskForm):
        title = StringField('Titre',
                        validators=[DataRequired(), Length(min=2, max=20)])
        text = StringField('Texte',
                        validators=[DataRequired(), Length(min=2, max=300)])
        submit = SubmitField('Post')
        

class EditPostForm(FlaskForm):
    title = StringField('Titre', validators=[DataRequired()])
    text = TextAreaField('Texte', validators=[DataRequired()])
    submit = SubmitField('Modifier le Post')