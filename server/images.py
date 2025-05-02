# --- IMPORTS ---
import random
import time
import httpx
from duckduckgo_search import DDGS
from easyocr import Reader  # Attention installe bien easyocr
from io import BytesIO
from PIL import Image
import numpy as np


def initialize_easyocr():
    try:
        reader = Reader(['fr'], gpu=False)
    except Exception as e:
        print(f"Erreur lors de l'initialisation d'EasyOCR : {e}")
        return None
    return reader

reader = initialize_easyocr()

def search_and_display_images(search_query):
    retry = 0
    while retry < 3:
        try:
            results = DDGS().images(
                keywords=search_query,
                region='wt-wt',
                safesearch='off',
                max_results=8,
            )
            break
        except Exception as e:
            if "403" in str(e) or "Ratelimit" in str(e):
                print("Ratelimit reached, waiting 5 seconds...")
                time.sleep(5)
                retry += 1
            else:
                raise e

    images = []
    for result in results:
        image_url = result['image']
        images.append(image_url)

    return images


def is_bad_image(image_url):
    try:
        response = httpx.get(image_url, timeout=5,follow_redirects=True)
        if response.status_code != 200:
            print(f"Erreur HTTP : {response.status_code}")
            return True

        img_bytes = BytesIO(response.content)
        image = Image.open(img_bytes).convert("RGB")
        image_np = np.array(image)  # ✅ conversion PIL → NumPy

        results = reader.readtext(image_np)

        if not results:
            return False

        texts = [text for (_, text, _) in results]

        if len(texts) >= 6:
            return True

        lowered = [t.lower() for t in texts]
        counts = {}
        for t in lowered:
            counts[t] = counts.get(t, 0) + 1

        for text, count in counts.items():
            if count >= 3 and len(text) <= 10:
                return True

        return False

    except Exception as e:
        print(f"Erreur lors de la lecture de l'image : {e}")
        return True




def filtrer(images):
    if not images:
        return None

    toClean = images[:-1]
    secours = images[-1]

    toClean = [img for img in toClean if not is_bad_image(img)]

    if not toClean:
        img = secours  
    else:
        secours = toClean[-1]
        toClean = toClean[:-1]

        toClean = [img for img in toClean if img.endswith('.jpg') or img.endswith('.png')]

        if not toClean:
            img = secours
        else:
            img = random.choice(toClean)

    return img






