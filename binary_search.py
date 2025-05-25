import time
import numpy as np
import heapq
from bisect import bisect_left

# 1. Lecture et transformation en ASCII
def word_to_ascii(word):
    return [ord(c) for c in word.strip()]

with open('words.csv', 'r') as f:
    ascii_words = [word_to_ascii(line) for line in f]

# 2. Heap sort (via heapify + heappop)
heapq.heapify(ascii_words)
sorted_ascii_words = [heapq.heappop(ascii_words) for _ in range(len(ascii_words))]

# 3. Sauvegarde
np.save('ascii_sorted.npy', np.array(sorted_ascii_words, dtype=object))


# 4. Rechargement
ascii_array = np.load('ascii_sorted.npy', allow_pickle=True)

# 5. Binary search sur des listes (fonctionne avec bisect)
def binary_search(arr, target):
    idx = bisect_left(arr, target)
    if idx < len(arr) and arr[idx] == target:
        return True
    return False

# 6. Mots à chercher
words_to_test = ['zebra', 'apple', 'quantum', 'network','hello', 'world']
ascii_to_test = [word_to_ascii(w) for w in words_to_test]

# 7. Tests et comparaison
print("\nRésultats de recherche :")
for word, ascii_word in zip(words_to_test, ascii_to_test):
    start = time.time()
    found_bin = binary_search(ascii_array.tolist(), ascii_word)
    time_bin = time.time() - start

    start = time.time()
    found_in = ascii_word in ascii_array.tolist()
    time_in = time.time() - start

    print(f"\nMot : {word}")
    print(f" - Binary search : Temps : {time_bin:.6f}s")
    print(f" - Mot in tableau :  Temps : {time_in:.6f}s")
