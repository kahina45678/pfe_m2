import re
from keybert import KeyBERT

def init_kbert():
    kw_model = KeyBERT()
    return kw_model

def extract_kw(kw_model,question):
    """Extract single top keyword using BERT"""
    keywords = kw_model.extract_keywords(
        question, 
        keyphrase_ngram_range=(1, 2),  
        stop_words='english',
        top_n=1  
    )
    return keywords[0][0] if keywords else None