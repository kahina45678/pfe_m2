import sqlite3

# Connexion à la base de données (créée si elle n'existe pas)
conn = sqlite3.connect("kahoot_clone.db")
cursor = conn.cursor()

# Création de la table user
cursor.execute("""
CREATE TABLE IF NOT EXISTS user (
    id_user INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    adresse_mail TEXT UNIQUE NOT NULL,
    mot_de_passe TEXT NOT NULL,
    date_inscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

# Création de la table quiz
cursor.execute("""
CREATE TABLE IF NOT EXISTS quiz (
    id_quiz INTEGER PRIMARY KEY AUTOINCREMENT,
    id_user INTEGER NOT NULL,
    nom TEXT NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_user) REFERENCES user(id_user) ON DELETE CASCADE
)
""")

# Création de la table qst (questions)
cursor.execute("""
CREATE TABLE IF NOT EXISTS qst (
    id_qst INTEGER PRIMARY KEY AUTOINCREMENT,
    id_quiz INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('QCM', 'VraiFaux', 'TexteLibre')),
    quest TEXT NOT NULL,
    rep1 TEXT NOT NULL,
    rep2 TEXT,
    rep3 TEXT,
    rep4 TEXT,
    bonne_rep INTEGER NOT NULL CHECK(bonne_rep BETWEEN 1 AND 4),
    double BOOLEAN NOT NULL DEFAULT 0,
    img BLOB,
    FOREIGN KEY (id_quiz) REFERENCES quiz(id_quiz) ON DELETE CASCADE
)
""")

# Enregistrement des modifications et fermeture de la connexion
conn.commit()
conn.close()

print("Tables créées avec succès.")
