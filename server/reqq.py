import sqlite3

DB_PATH = "/home/kahina-ameouni/Téléchargements/pfe_m2-main(1)/pfe_m2-main/server/quiz.db"

# Connexion
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Exécution du SELECT *
cursor.execute("SELECT * FROM questions")
rows = cursor.fetchall()

# Récupérer les noms de colonnes
columns = [desc[0] for desc in cursor.description]

# Affichage
print("=" * 100)
print("TABLE: questions")
print("=" * 100)

for row in rows:
    print("-" * 100)
    for col, val in zip(columns, row):
        print(f"{col}: {val}")
print("-" * 100)

# Fermeture
conn.close()
