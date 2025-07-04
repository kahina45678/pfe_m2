import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer, util
import re
from autocorrect import Speller
import csv


def init_speller():
    spell = Speller()
    return spell


def correction_mot(mot, spell):
    mot = spell(mot)
    return mot


def charger_mots(filename="C:/Users/hp/Desktop/Kahoot/QuizMaster/server/words_ascii_sorted.csv"):
    words = []

    try:
        with open(filename, 'r', newline='') as csvfile:
            csv_reader = csv.reader(csvfile)
            for row in csv_reader:
                # Assuming each row contains one word in the first column
                if row:  # Skip empty rows
                    try:
                        # Convert the string to an integer
                        number = int(row[0])
                        words.append(number)
                    except ValueError:
                        print(
                            f"Warning: Could not convert '{row[0]}' to an integer. Skipping.")
    except FileNotFoundError:
        print(f"Error: File '{filename}' not found.")
        return None
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return None

    # Debug print to check the type of the first element
    if words:
        print("Le type des mots dans mon vecteur est", type(words[0]))
    else:
        print("La liste des mots est vide.")

    return words


def init_model_recherche():
    model_bert = SentenceTransformer('all-MiniLM-L6-v2')
    return model_bert


def chercher_bert(mot, texte, model_bert, seuil=0.30):
    emb_mot = model_bert.encode(mot, convert_to_tensor=True)
    emb_texte = model_bert.encode(texte, convert_to_tensor=True)

    similarite = util.cos_sim(emb_mot, emb_texte).item()
    print(f"Similarité entre '{mot}' et '{texte}' : {similarite}")

    return similarite >= seuil
