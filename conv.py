input_file = "words.csv"
output_file = "words_ascii.csv"

with open(input_file, "r", encoding="utf-8") as f:
    words = [line.strip() for line in f if line.strip()]

# Transformation ASCII pure (chaîne de chiffres)
ascii_lines = [''.join(str(ord(c)) for c in word) for word in words]

# Écriture directe, une ligne ASCII par mot
with open(output_file, "w", encoding="utf-8") as f:
    for line in ascii_lines:
        f.write(line + "\n")
