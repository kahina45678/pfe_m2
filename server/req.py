import sqlite3
from collections import defaultdict

# ANSI escape codes
RESET = "\033[0m"
BOLD = "\033[1m"
CYAN = "\033[96m"
YELLOW = "\033[93m"
GREEN = "\033[92m"
BLUE = "\033[94m"
GREY = "\033[90m"

# Chemin vers la base SQLite
import sqlite3
from rich.console import Console
from rich.table import Table

DB_PATH = "/home/kahina-ameouni/Téléchargements/pfe_m2-main(1)/pfe_m2-main/server/quiz.db"

# Connexion
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Exécution de la requête
cursor.execute('''
SELECT quiz_id, question, option_a, option_b, option_c, option_d, correct_answer, image_url
FROM questions
ORDER BY quiz_id
''')
rows = cursor.fetchall()

# Affichage esthétique avec rich
console = Console()
last_quiz_id = None

for row in rows:
    quiz_id, question, a, b, c, d, answer, image_url = row
    if quiz_id != last_quiz_id:
        if last_quiz_id is not None:
            console.print()  # saut de ligne
        console.rule(f"[bold blue]Quiz ID: {quiz_id}")
        last_quiz_id = quiz_id

    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("Question", width=50)
    table.add_column("A")
    table.add_column("B")
    table.add_column("C")
    table.add_column("D")
    table.add_column("✓")
    table.add_column("Image URL", style="cyan", overflow="fold")

    table.add_row(question, a or "", b or "", c or "", d or "", answer or "", image_url or "-")
    console.print(table)

conn.close()


# Connexion
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Récupération des données
cursor.execute('''
    SELECT quiz_id, question, option_a, option_b, option_c, option_d,correct_answer, image_url
    FROM questions
    ORDER BY quiz_id
''')
questions = cursor.fetchall()

# Groupement par quiz_id
grouped = defaultdict(list)
for row in questions:
    quiz_id = row[0]
    grouped[quiz_id].append(row[1:])

# Lignes décoratives
LINE = f"{GREY}{'=' * 80}{RESET}"
SUB_LINE = f"{GREY}{'-' * 80}{RESET}"

# Affichage
for quiz_id in sorted(grouped):
    print(f"\n{LINE}")
    print(f"{BOLD}{CYAN}QUIZ ID{RESET}   : {YELLOW}{quiz_id}{RESET}")
    print(f"{LINE}\n")
    
    for i, (question, a, b, c, d, rep,img) in enumerate(grouped[quiz_id], 1):
        print(f"{BOLD}{BLUE}Q{i:02d}.{RESET} {question}")
        print(f"    {GREEN}A){RESET} {a}")
        print(f"    {GREEN}B){RESET} {b}")
        print(f"    {GREEN}C){RESET} {c}")
        print(f"    {GREEN}D){RESET} {d}")
        print(f"    {YELLOW}Réponse correcte :{RESET} {rep}")
        print(f"    {CYAN}Image URL:{RESET} {img if img else GREY + '—' + RESET}")
        print(SUB_LINE)

# Fermeture
conn.close()
