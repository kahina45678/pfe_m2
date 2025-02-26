import sqlite3


with sqlite3.connect("kahoot_clone.db") as con:
    cur = con.cursor()
    cur.execute('''CREATE TABLE IF NOT EXISTS room (
        id_room TEXT PRIMARY KEY,
        id_quiz INTEGER,
        date_creation TEXT
    )''')
    
    cur.execute('''CREATE TABLE IF NOT EXISTS joueurs (
        id_room TEXT,
        pseudo TEXT,
        FOREIGN KEY (id_room) REFERENCES room(id_room)
    )''')
    con.commit()