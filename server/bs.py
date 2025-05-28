import time
import numpy as np
import heapq
from bisect import bisect_left


def binary_search(arr, x):
    low = 0
    high = len(arr) - 1
    mid = 0
    while low <= high:
        mid = (high + low) // 2

        if arr[mid] < x:
            low = mid + 1

        elif arr[mid] > x:
            high = mid - 1

        else:
            return mid

    return -1


def convertir_ascii(cadena):
    """
    Convierte una cadena de texto a un entero formado por la concatenación
    de los códigos ASCII de cada carácter.

    Args:
        cadena (str): La chaîne de caractères à convertir

    Returns:
        int: Entier formé par la concatenation des codes ASCII
    """
    codigos_concatenados = ''.join(str(ord(c)) for c in cadena)
    return int(codigos_concatenados) if codigos_concatenados else 0
