import matplotlib.pyplot as plt
import numpy as np

img = plt.imread("a.png")


img = np.mean(img, axis=2) 

moyenne = 0
hauteur, largeur = img.shape
nb_px = hauteur * largeur

for i in range(hauteur):
    for j in range(largeur):
        moyenne += img[i][j]

moyenne /= nb_px

print("couleur : ", moyenne)
