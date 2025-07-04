from transformers import MarianMTModel, MarianTokenizer


def init_traduction():

    model_name = "Helsinki-NLP/opus-mt-en-fr"
    tokenizer = MarianTokenizer.from_pretrained(model_name)
    model = MarianMTModel.from_pretrained(model_name)
    return tokenizer, model


def traduire(src_text, tokenizer, model):
    print(f"Texte à traduire : {src_text}")
    inputs = tokenizer(src_text, return_tensors="pt")
    translated_tokens = model.generate(**inputs)
    translated_text = tokenizer.decode(
        translated_tokens[0], skip_special_tokens=True)
    print(f"resultat de la traduction : {translated_text}")
    return translated_text
