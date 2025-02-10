import sqlite3


conn = sqlite3.connect("kahoot_clone.db")
cursor = conn.cursor()


cursor.execute("SELECT * FROM qst")


resultats = cursor.fetchall()

print("Contenu de la table 'quiz' :")
for row in resultats:
    print(row)

conn.close()
