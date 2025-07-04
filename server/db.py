
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

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id INTEGER NOT NULL,
        question TEXT NOT NULL,
        option_a TEXT,
        option_b TEXT,
        option_c TEXT,
        option_d TEXT,
        correct_answer TEXT,
        time_limit INTEGER DEFAULT 15,
        points INTEGER DEFAULT 10,
        type TEXT NOT NULL,
        image_url TEXT,  -- Nouveau champ pour les URLs d'images
        image_source TEXT,  -- 'unsplash', 'upload', ou 'none'
        FOREIGN KEY (quiz_id) REFERENCES quizzes (id) ON DELETE CASCADE
    )
    ''')

    # Table pour stocker les métadonnées des images Unsplash
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS unsplash_photos (
        id TEXT PRIMARY KEY,
        question_id INTEGER NOT NULL,
        regular_url TEXT NOT NULL,
        thumb_url TEXT NOT NULL,
        author_name TEXT,
        author_url TEXT,
        FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE
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

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS game_players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        FOREIGN KEY (game_id) REFERENCES games (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id INTEGER NOT NULL,
        room_code TEXT NOT NULL,
        host_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quiz_id) REFERENCES quizzes (id),
        FOREIGN KEY (host_id) REFERENCES users (id)
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        answer_text TEXT,
        is_correct BOOLEAN,
        FOREIGN KEY (game_id) REFERENCES games (id),
        FOREIGN KEY (question_id) REFERENCES questions (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')


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
        SELECT q.id, q.question, q.option_a, q.option_b, q.option_c, q.option_d, 
               q.correct_answer, q.time_limit, q.points, q.type, q.image_url, q.image_source,
               u.id as unsplash_id, u.regular_url, u.thumb_url, u.author_name, u.author_url
        FROM questions q
        LEFT JOIN unsplash_photos u ON q.id = u.question_id
        WHERE q.quiz_id = ?
        ''', (quiz_id,)).fetchall()

        quiz_dict['questions'] = []
        for q in questions:
            question = dict(q)
            if question['image_source'] == 'unsplash':
                question['image'] = {
                    'source': 'unsplash',
                    'urls': {
                        'regular': question['regular_url'],
                        'thumb': question['thumb_url']
                    },
                    'user': {
                        'name': question['author_name'],
                        'links': {
                            'html': question['author_url']
                        }
                    }
                }
            elif question['image_source'] == 'upload':
                question['image'] = {
                    'source': 'upload',
                    'path': question['image_url']
                }

            # Remove unsplash-specific fields from the main question object
            for field in ['unsplash_id', 'regular_url', 'thumb_url', 'author_name', 'author_url']:
                question.pop(field, None)

            quiz_dict['questions'].append(question)

        conn.close()
        return quiz_dict

    conn.close()
    return None


def create_quiz(title, description, user_id, questions):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
        INSERT INTO quizzes (title, description, user_id)
        VALUES (?, ?, ?)
        ''', (title, description, user_id))
        quiz_id = cursor.lastrowid

        for q in questions:
            # Insert the question
            cursor.execute('''
            INSERT INTO questions 
            (quiz_id, question, option_a, option_b, option_c, option_d, 
             correct_answer, time_limit, points, type, image_url, image_source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                quiz_id,
                q['question'],
                q.get('option_a'),
                q.get('option_b'),
                q.get('option_c'),
                q.get('option_d'),
                q.get('correct_answer'),
                q.get('time_limit', 15),
                q.get('points', 10),
                q['type'],
                q.get('image', {}).get('urls', {}).get('regular') if q.get('image', {}).get(
                    'source') == 'unsplash' else q.get('image', {}).get('path'),
                q.get('image', {}).get('source', 'none')
            ))

            question_id = cursor.lastrowid

            # Si l'image vient d'Unsplash, stocker les métadonnées
            if q.get('image', {}).get('source') == 'unsplash':
                unsplash_data = q.get('image', {})
                try:
                    cursor.execute('''
                    INSERT INTO unsplash_photos 
                    (id, question_id, regular_url, thumb_url, author_name, author_url)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ''', (
                        unsplash_data.get('id'),
                        question_id,
                        unsplash_data.get('urls', {}).get('regular'),
                        unsplash_data.get('urls', {}).get('thumb'),
                        unsplash_data.get('user', {}).get('name'),
                        unsplash_data.get('user', {}).get('links', {}).get(
                            'html') if unsplash_data.get('user', {}).get('links') else None
                    ))
                except KeyError as e:
                    print(f"Warning: Missing Unsplash metadata - {e}")
                    continue

        conn.commit()
        return quiz_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def extract_image_info(q):
    image = q.get('image')
    if not image:
        return None, "none"
    if image.get('source') == 'unsplash':
        return image.get('urls', {}).get('regular'), "unsplash"
    elif image.get('source') == 'upload':
        return image.get('path'), "upload"
    return None, "none"


def update_quiz(quiz_id, title, description, questions):

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Update quiz metadata
        cursor.execute('''
        UPDATE quizzes
        SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        ''', (title, description, quiz_id))

        # Delete old questions and associated unsplash photos
        cursor.execute(
            'DELETE FROM unsplash_photos WHERE question_id IN (SELECT id FROM questions WHERE quiz_id = ?)', (quiz_id,))
        cursor.execute('DELETE FROM questions WHERE quiz_id = ?', (quiz_id,))

        # Insert new questions
        for q in questions:
            option_a = q.get('option_a')
            option_b = q.get('option_b')
            option_c = q.get('option_c') if q['type'] == 'qcm' else None
            option_d = q.get('option_d') if q['type'] == 'qcm' else None
            image_url, image_source = extract_image_info(q)

            cursor.execute('''
                INSERT INTO questions 
                (quiz_id, question, option_a, option_b, option_c, option_d, 
                correct_answer, time_limit, points, type, image_url, image_source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                quiz_id,
                q['question'],
                option_a,
                option_b,
                option_c,
                option_d,
                q.get('correct_answer'),
                q.get('time_limit', 15),
                q.get('points', 10),
                q['type'],
                image_url,
                image_source
            ))

            question_id = cursor.lastrowid

            if image_source == 'unsplash':
                unsplash_data = q.get('image', {})
                try:
                    cursor.execute('''
                        INSERT INTO unsplash_photos 
                        (id, question_id, regular_url, thumb_url, author_name, author_url)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (
                        unsplash_data.get('id'),
                        question_id,
                        unsplash_data.get('urls', {}).get('regular'),
                        unsplash_data.get('urls', {}).get('thumb'),
                        unsplash_data.get('user', {}).get('name'),
                        unsplash_data.get('user', {}).get('links', {}).get(
                            'html') if unsplash_data.get('user', {}).get('links') else None
                    ))
                except KeyError as e:
                    print(f"Warning: Missing Unsplash metadata - {e}")
                    continue

        conn.commit()
        return True

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


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


def get_game_players(game_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT DISTINCT u.id as user_id, u.username, gp.score
        FROM game_players gp
        JOIN users u ON gp.user_id = u.id
        WHERE gp.game_id = ?
        ORDER BY gp.score DESC
    ''', (game_id,))
    players = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return players
