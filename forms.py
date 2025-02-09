from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, BooleanField ,FileField,TextAreaField,SelectField
from wtforms.validators import DataRequired, Length, email, EqualTo,Optional


class RegistrationForm(FlaskForm):
    nom = StringField('Username',
                           validators=[DataRequired(), Length(min=2, max=20)])
    prenom = StringField('Username',
                           validators=[DataRequired(), Length(min=2, max=20)])
    
    adresse_mail = StringField('adresse_mail',
                        validators=[DataRequired(), email()])
    password = PasswordField('Password', validators=[DataRequired()])
    confirm_password = PasswordField('Confirm Password',
                                     validators=[DataRequired(), EqualTo('password')])
    submit = SubmitField('Sign Up')


class LoginForm(FlaskForm):
    adresse_mail = StringField('adresse_mail',
                        validators=[DataRequired(), email()])
    password = PasswordField('Password', validators=[DataRequired()])
    remember = BooleanField('Remember Me')
    submit = SubmitField('Login')


class UpdateAccount(FlaskForm):
        username = StringField('Username',
                        validators=[DataRequired(), Length(min=2, max=20)])
        password = PasswordField('Password', validators=[DataRequired()])
        pdp = FileField('Profile Picture') 

        submit = SubmitField('update')
        

class TitreQuiz(FlaskForm):
     titre=StringField('Titre',
                           validators=[DataRequired(), Length(min=2, max=300)])
     submit = SubmitField('Suivant')



class NewQuestionForm(FlaskForm):
    
    question = StringField('Question',
                           validators=[DataRequired(), Length(min=2, max=300)])
    
    type_question = SelectField('Type de question',
        choices=[('QCM', 'QCM (4 réponses)'),
                ('VraiFaux', 'Vrai/Faux'),
                ('TexteLibre', 'Réponse texte')],
        validators=[DataRequired()])

    
    reponse_1 = StringField('Réponse 1', validators=[DataRequired(), Length(min=1, max=100)])
    reponse_2 = StringField('Réponse 2', validators=[Optional(), Length(max=100)])
    reponse_3 = StringField('Réponse 3', validators=[Optional(), Length(max=100)])
    reponse_4 = StringField('Réponse 4', validators=[Optional(), Length(max=100)])

    bonne_reponse = StringField('Bonne réponse',
                                validators=[DataRequired(), Length(min=1, max=100)],
                                description="Indique la bonne réponse (exactement comme écrit ci-dessus).")

    compte_double = BooleanField('Compte double')

    submit_next = SubmitField('Question suivante')
    submit_prev = SubmitField('Question précédente')
    submit_validate = SubmitField('Valider')

        

class EditPostForm(FlaskForm):
    title = StringField('Titre', validators=[DataRequired()])
    text = TextAreaField('Texte', validators=[DataRequired()])
    submit = SubmitField('Modifier le Post')