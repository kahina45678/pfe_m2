import sqlite3
import json

def load_quiz_formatted(quiz_id: int, db_path="quiz.db"):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Récupérer quiz
    quiz_row = cursor.execute("SELECT * FROM quizzes WHERE id = ?", (quiz_id,)).fetchone()
    if not quiz_row:
        raise ValueError(f"No quiz found with ID {quiz_id}")

    # Récupérer questions
    question_rows = cursor.execute("SELECT * FROM questions WHERE quiz_id = ?", (quiz_id,)).fetchall()

    questions = []
    for row in question_rows:
        qtype = row["type"]
        correct_answer = row["correct_answer"]

        # Cas 1 : QCM → si correct_answer est encore A/B/C/D, on récupère le texte
        if qtype == "qcm" and correct_answer in ("A", "B", "C", "D"):
            index = {"A": 0, "B": 1, "C": 2, "D": 3}[correct_answer]
            propositions = [row["option_a"], row["option_b"], row["option_c"], row["option_d"]]
            correct_answer = propositions[index] if index < len(propositions) else correct_answer

        # Cas 2 : true_false → standardisation vers "Vrai"/"Faux"
        elif qtype == "true_false":
            correct_answer = "Vrai" if correct_answer.lower() == "true" else "Faux"

        # Construction champ image
        image = None
        if row["image_source"] == "unsplash":
            image = {
                "source": "unsplash",
                "urls": {
                    "thumb": row["image_url"],
                    "regular": row["image_url"].replace("&w=200", "&w=800") if "&w=200" in row["image_url"] else row["image_url"]
                }
            }
        elif row["image_source"] == "upload":
            image = {
                "source": "upload",
                "path": row["image_url"]
            }

        # Ajout question formatée
        questions.append({
            "id": row["id"],
            "question": row["question"],
            "option_a": row["option_a"],
            "option_b": row["option_b"],
            "option_c": row["option_c"],
            "option_d": row["option_d"],
            "correct_answer": correct_answer,
            "time_limit": row["time_limit"],
            "points": row["points"],
            "type": qtype,
            "image": image
        })

    quiz_data = {
        "id": quiz_row["id"],
        "title": quiz_row["title"],
        "description": quiz_row["description"],
        "user_id": quiz_row["user_id"],
        "questions": questions
    }

    return quiz_data

# 🔧 Exemple d'utilisation :
if __name__ == "__main__":
    quiz_id = 9  # change selon ton besoin
    data = load_quiz_formatted(quiz_id)
    print(json.dumps(data, indent=2, ensure_ascii=False))
