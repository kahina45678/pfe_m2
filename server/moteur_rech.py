
import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer, util
import re


garder=[]

def charger_mots():
    mots= pd.read_csv('../words.csv', encoding='utf-8')
    return mots

def mot_existe(mot, mots):
    return mot in mots.values

def correction_mot(mot):
    return mot


def rechercher_re(mot,texte):
    if mot in texte:
        garder.append(texte)
        return garder,1
    else:
        return garder,0



def init_model_recherche():
    
    model_bert = SentenceTransformer('all-MiniLM-L6-v2')
    return model_bert

    

def chercher_bert(mot, texte,model_bert, seuil=0.7):
    emb_mot = model_bert.encode(mot, convert_to_tensor=True)
    emb_texte = model_bert.encode(texte, convert_to_tensor=True)

    similarite = util.cos_sim(emb_mot, emb_texte).item()


    if similarite >= seuil:
        return True


def rechercher(phrase,texte):
    mots=phrase.split(" ")
    for i in mots:
        if not mot_existe(i, charger_mots()):
            i=correction_mot(i)
    phrase=" ".join(mots)
    garder,val= rechercher_re(phrase,texte)
    if val==1:
        return garder
    else:
        chercher_bert(phrase,texte)
        return garder
            

