import sqlite3

# Chemin vers ta base SQLite
DB_PATH = "/home/kahina-ameouni/Téléchargements/pfe_m2-main(1)/pfe_m2-main/server/quiz.db"  # <-- change ici

# Connexion
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Mise à jour du champ type
cursor.execute("UPDATE questions SET type = 'qcm' WHERE type = 'MCQ'")
conn.commit()

print("✅ Champs 'type' mis à jour de 'MCQ' vers 'qcm'.")

# Vérification optionnelle
cursor.execute("SELECT COUNT(*) FROM questions WHERE type = 'qcm'")
count = cursor.fetchone()[0]
print(f"Total de questions 'qcm' : {count}")

conn.close()
