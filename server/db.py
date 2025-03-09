import sqlite3
import os
from datetime import datetime

DB_PATH = 'quiz.db'

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Create quizzes table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS quizzes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    # Create questions table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id INTEGER NOT NULL,
        question TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        time_limit INTEGER DEFAULT 15,
        points INTEGER DEFAULT 10,
        FOREIGN KEY (quiz_id) REFERENCES quizzes (id) ON DELETE CASCADE
    )
    ''')
    
    # Create scores table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        quiz_id INTEGER,
        score INTEGER,
        quiz_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (quiz_id) REFERENCES quizzes (id)
    )
    ''')
    
    # Create rooms table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_code TEXT UNIQUE NOT NULL,
        quiz_id INTEGER NOT NULL,
        host_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'waiting',
        FOREIGN KEY (quiz_id) REFERENCES quizzes (id),
        FOREIGN KEY (host_id) REFERENCES users (id)
    )
    ''')
    
    # Add some sample questions if none exist
    cursor.execute("SELECT COUNT(*) FROM quizzes")
    if cursor.fetchone()[0] == 0:
        # Insert a sample quiz
        cursor.execute('''
        INSERT INTO quizzes (title, description, user_id) 
        VALUES (?, ?, ?)
        ''', ('General Knowledge', 'A quiz about various general knowledge topics', 1))
        
        quiz_id = cursor.lastrowid
        
        sample_questions = [
            (quiz_id, "What is the capital of France?", "Berlin", "Madrid", "Paris", "Rome", "Paris", 15, 10),
            (quiz_id, "Which planet is known as the Red Planet?", "Venus", "Mars", "Jupiter", "Saturn", "Mars", 15, 10),
            (quiz_id, "What is the largest mammal?", "Elephant", "Blue Whale", "Giraffe", "Polar Bear", "Blue Whale", 15, 10),
            (quiz_id, "Who wrote 'Romeo and Juliet'?", "Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain", "William Shakespeare", 15, 10),
            (quiz_id, "What is the chemical symbol for gold?", "Go", "Gd", "Au", "Ag", "Au", 15, 10),
            (quiz_id, "Which country is home to the kangaroo?", "New Zealand", "South Africa", "Australia", "Brazil", "Australia", 15, 10),
            (quiz_id, "What is the tallest mountain in the world?", "K2", "Mount Everest", "Kilimanjaro", "Denali", "Mount Everest", 15, 10),
            (quiz_id, "Which element has the chemical symbol 'O'?", "Osmium", "Oxygen", "Oganesson", "Olivine", "Oxygen", 15, 10),
            (quiz_id, "Who painted the Mona Lisa?", "Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo", "Leonardo da Vinci", 15, 10),
            (quiz_id, "What is the largest ocean on Earth?", "Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean", "Pacific Ocean", 15, 10)
        ]
        
        cursor.executemany(
            "INSERT INTO questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_answer, time_limit, points) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            sample_questions
        )
    
    conn.commit()
    conn.close()

def get_quizzes_by_user(user_id):
    conn = get_db_connection()
    quizzes = conn.execute('''
    SELECT id, title, description, created_at, updated_at
    FROM quizzes
    WHERE user_id = ?
    ORDER BY updated_at DESC
    ''', (user_id,)).fetchall()
    conn.close()
    return [dict(quiz) for quiz in quizzes]

def get_quiz_by_id(quiz_id):
    conn = get_db_connection()
    quiz = conn.execute('''
    SELECT id, title, description, user_id, created_at, updated_at
    FROM quizzes
    WHERE id = ?
    ''', (quiz_id,)).fetchone()
    
    if quiz:
        quiz_dict = dict(quiz)
        questions = conn.execute('''
        SELECT id, question, option_a, option_b, option_c, option_d, correct_answer, time_limit, points
        FROM questions
        WHERE quiz_id = ?
        ''', (quiz_id,)).fetchall()
        quiz_dict['questions'] = [dict(q) for q in questions]
        conn.close()
        return quiz_dict
    
    conn.close()
    return None

def create_quiz(title, description, user_id, questions):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Insert quiz
    cursor.execute('''
    INSERT INTO quizzes (title, description, user_id)
    VALUES (?, ?, ?)
    ''', (title, description, user_id))
    
    quiz_id = cursor.lastrowid
    
    # Insert questions
    for q in questions:
        cursor.execute('''
        INSERT INTO questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_answer, time_limit, points)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            quiz_id, 
            q['question'], 
            q['option_a'], 
            q['option_b'], 
            q['option_c'], 
            q['option_d'], 
            q['correct_answer'],
            q.get('time_limit', 15),
            q.get('points', 10)
        ))
    
    conn.commit()
    conn.close()
    return quiz_id

def update_quiz(quiz_id, title, description, questions):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Update quiz
    cursor.execute('''
    UPDATE quizzes
    SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    ''', (title, description, quiz_id))
    
    # Delete existing questions
    cursor.execute('DELETE FROM questions WHERE quiz_id = ?', (quiz_id,))
    
    # Insert new questions
    for q in questions:
        cursor.execute('''
        INSERT INTO questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_answer, time_limit, points)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            quiz_id, 
            q['question'], 
            q['option_a'], 
            q['option_b'], 
            q['option_c'], 
            q['option_d'], 
            q['correct_answer'],
            q.get('time_limit', 15),
            q.get('points', 10)
        ))
    
    conn.commit()
    conn.close()
    return True

def delete_quiz(quiz_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Delete quiz (questions will be deleted via ON DELETE CASCADE)
    cursor.execute('DELETE FROM quizzes WHERE id = ?', (quiz_id,))
    
    conn.commit()
    conn.close()
    return True

def create_room(quiz_id, host_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Generate a unique 6-digit room code
    import random
    room_code = ''.join(random.choices('0123456789', k=6))
    
    # Check if code already exists
    while cursor.execute('SELECT COUNT(*) FROM rooms WHERE room_code = ?', (room_code,)).fetchone()[0] > 0:
        room_code = ''.join(random.choices('0123456789', k=6))
    
    # Insert room
    cursor.execute('''
    INSERT INTO rooms (room_code, quiz_id, host_id, status)
    VALUES (?, ?, ?, 'waiting')
    ''', (room_code, quiz_id, host_id))
    
    room_id = cursor.lastrowid
    
    conn.commit()
    conn.close()
    return {'id': room_id, 'room_code': room_code}

def get_room_by_code(room_code):
    conn = get_db_connection()
    room = conn.execute('''
    SELECT r.id, r.room_code, r.quiz_id, r.host_id, r.status, q.title as quiz_title
    FROM rooms r
    JOIN quizzes q ON r.quiz_id = q.id
    WHERE r.room_code = ?
    ''', (room_code,)).fetchone()
    
    conn.close()
    return dict(room) if room else None

def save_score(user_id, quiz_id, score):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
    INSERT INTO scores (user_id, quiz_id, score)
    VALUES (?, ?, ?)
    ''', (user_id, quiz_id, score))
    
    conn.commit()
    conn.close()
    return True

def get_leaderboard(limit=10):
    conn = get_db_connection()
    leaderboard = conn.execute('''
    SELECT u.username, s.score, q.title as quiz_title, s.quiz_date
    FROM scores s
    JOIN users u ON s.user_id = u.id
    JOIN quizzes q ON s.quiz_id = q.id
    ORDER BY s.score DESC
    LIMIT ?
    ''', (limit,)).fetchall()
    
    conn.close()
    return [dict(entry) for entry in leaderboard]