import spacy
import pytextrank
from sklearn.feature_extraction.text import TfidfVectorizer
from collections import defaultdict
import time
from colorama import Fore, Style, init

# Initialisation de colorama
init(autoreset=True)

# Textes pour test
phrases = [
    "During the Industrial Revolution, innovations in transportation and manufacturing transformed economies and societies across Europe.",
    "Photosynthesis is the process by which green plants convert sunlight into chemical energy, producing oxygen as a byproduct.",
    "Social media platforms have significantly altered how people communicate, shaping public opinion and even influencing political movements.",
    "Quantum computing leverages quantum mechanical phenomena like superposition and entanglement to perform calculations far beyond classical computers.",
    "The Renaissance period saw extraordinary developments in art, science, and philosophy that shaped modern Western culture.",
    "Climate change is causing rising sea levels, more extreme weather events, and disruptions to ecosystems worldwide.",
    "Machine learning algorithms improve their performance through exposure to data without being explicitly programmed.",
    "The human brain contains approximately 86 billion neurons that communicate through complex electrochemical signals.",
    "Blockchain technology provides a decentralized and secure way to record transactions across many computers.",
    "Antibiotic resistance occurs when bacteria evolve mechanisms to withstand the drugs designed to kill them."
]

# Initialiser spaCy + TextRank
nlp = spacy.load("en_core_web_sm")
nlp.add_pipe("textrank")

# -------------------------------
# MÉTHODE 1 : PyTextRank
# -------------------------------
def run_textrank(phrases):
    start = time.time()
    print(Fore.BLUE + Style.BRIGHT + "\nMÉTHODE 1 : Extraction avec PyTextRank")
    print(Fore.BLUE + "-" * 70)
    textrank_data = defaultdict(list)
    
    for idx, phrase in enumerate(phrases):
        doc = nlp(phrase)
        print(Fore.YELLOW + f"\nPhrase {idx+1} :")
        print(Fore.WHITE + f"{phrase}\n")
        print(Fore.GREEN + "Top mots-clés :")
        for i, p in enumerate(doc._.phrases[:5], start=1):
            print(f"{i:>2}. {p.text:<50} {Fore.CYAN}Score : {p.rank:.4f}")
            textrank_data[idx].append((p.text, p.rank))
    
    end = time.time()
    return textrank_data, end - start

# -------------------------------
# MÉTHODE 2 : TF-IDF (corrected)
# -------------------------------
def run_tfidf(phrases):
    start = time.time()
    print(Fore.MAGENTA + Style.BRIGHT + "\nMÉTHODE 2 : Extraction avec TF-IDF")
    print(Fore.MAGENTA + "-" * 70)
    tfidf_data = defaultdict(dict)
    
    # Process all documents together for proper IDF calculation
    vectorizer = TfidfVectorizer(stop_words='english', ngram_range=(1, 2))
    X = vectorizer.fit_transform(phrases)
    feature_names = vectorizer.get_feature_names_out()
    
    for idx, phrase in enumerate(phrases):
        # Get scores for this document
        tfidf_scores = X[idx].toarray().flatten()
        
        # Get top scores with their indices
        top_indices = tfidf_scores.argsort()[::-1][:10]  # Top 10
        
        print(Fore.YELLOW + f"\nPhrase {idx+1} :")
        print(Fore.WHITE + f"{phrase}\n")
        print(Fore.GREEN + "Top mots-clés :")
        
        for i, col in enumerate(top_indices, start=1):
            if tfidf_scores[col] > 0:  # Only show terms with score > 0
                mot = feature_names[col]
                score = tfidf_scores[col]
                print(f"{i:>2}. {mot:<50} {Fore.CYAN}Score : {score:.4f}")
                tfidf_data[idx][mot] = score
    
    end = time.time()
    return tfidf_data, end - start

# Run both methods
textrank_data, textrank_time = run_textrank(phrases)
tfidf_data, tfidf_time = run_tfidf(phrases)

# -------------------------------
# COMPARAISON DES TEMPS
# -------------------------------
print(Fore.WHITE + Style.BRIGHT + "\n\nTEMPS D'EXÉCUTION COMPARATIF")
print("-" * 70)
print(f"{'Méthode':<20}{'Temps (s)':>15}")
print(f"{'-'*35}")
print(f"{'PyTextRank':<20}{textrank_time:>15.4f}")
print(f"{'TF-IDF':<20}{tfidf_time:>15.4f}")



# -------------------------------
# FIND COMMON KEYWORDS
# -------------------------------
print(Fore.CYAN + Style.BRIGHT + "\n\nMOTS-CLÉS COMMUNS ENTRE LES DEUX MÉTHODES")
print(Fore.CYAN + "-" * 70)

for idx in range(len(phrases)):
    # Get keywords from both methods
    textrank_keywords = {kw.lower() for kw, score in textrank_data[idx]}
    tfidf_keywords = {kw.lower() for kw in tfidf_data[idx].keys()}
    
    # Find intersection
    common_keywords = textrank_keywords & tfidf_keywords
    
    if common_keywords:
        print(Fore.YELLOW + f"\nPhrase {idx+1} :")
        print(Fore.WHITE + f"{phrases[idx]}\n")
        print(Fore.GREEN + "Mots-clés communs :")
        for i, kw in enumerate(sorted(common_keywords), start=1):
            # Get original capitalization from the original phrase
            original_kw = next((k for k in phrases[idx].lower().split() if kw in k), kw)
            print(f"{i:>2}. {original_kw}")
    else:
        print(Fore.YELLOW + f"\nPhrase {idx+1} :")
        print(Fore.WHITE + f"{phrases[idx]}\n")
        print(Fore.RED + "Aucun mot-clé commun trouvé")
        common_keywords=tfidf_keywords
        print(common_keywords)

