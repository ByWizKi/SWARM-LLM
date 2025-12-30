#!/usr/bin/env python3
"""
Script pour télécharger les images des monstres depuis Swarfarm CDN
"""

import json
import os
import requests
from tqdm import tqdm
from pathlib import Path

# Configuration
JSON_FILE = "monsters_rta.json"
IMAGES_DIR = "images"
BASE_URL = "https://swarfarm.com/static/herders/images/monsters/"

def main():
    # Créer le dossier images s'il n'existe pas
    os.makedirs(IMAGES_DIR, exist_ok=True)

    # Lire le fichier JSON
    print(f"Lecture du fichier {JSON_FILE}...")
    try:
        with open(JSON_FILE, "r", encoding="utf-8") as f:
            monsters = json.load(f)
    except FileNotFoundError:
        print(f"Erreur: Le fichier {JSON_FILE} n'existe pas.")
        return
    except json.JSONDecodeError as e:
        print(f"Erreur: Impossible de parser le JSON: {e}")
        return

    # Extraire toutes les valeurs uniques de image_filename
    print("Extraction des noms d'images...")
    image_filenames = set()
    for monster in monsters:
        if "image_filename" in monster and monster["image_filename"]:
            image_filenames.add(monster["image_filename"])

    total_images = len(image_filenames)
    print(f"Nombre d'images uniques trouvées: {total_images}")

    # Filtrer les images déjà téléchargées
    existing_files = set(os.listdir(IMAGES_DIR)) if os.path.exists(IMAGES_DIR) else set()
    images_to_download = [img for img in image_filenames if img not in existing_files]

    already_downloaded = total_images - len(images_to_download)
    if already_downloaded > 0:
        print(f"Images déjà téléchargées: {already_downloaded}")
    print(f"Images à télécharger: {len(images_to_download)}")

    if not images_to_download:
        print("Toutes les images sont déjà téléchargées!")
        return

    # Télécharger les images
    print(f"\nTéléchargement des images depuis {BASE_URL}...")
    downloaded = 0
    errors = 0
    error_list = []

    for image_filename in tqdm(images_to_download, desc="Téléchargement"):
        image_url = BASE_URL + image_filename
        image_path = os.path.join(IMAGES_DIR, image_filename)

        try:
            response = requests.get(image_url, timeout=30, stream=True)
            response.raise_for_status()

            # Sauvegarder l'image
            with open(image_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

            downloaded += 1

        except requests.exceptions.RequestException as e:
            errors += 1
            error_list.append((image_filename, str(e)))
            tqdm.write(f"Erreur pour {image_filename}: {e}")
        except Exception as e:
            errors += 1
            error_list.append((image_filename, str(e)))
            tqdm.write(f"Erreur inattendue pour {image_filename}: {e}")

    # Résumé final
    print("\n" + "="*60)
    print("RÉSUMÉ DU TÉLÉCHARGEMENT")
    print("="*60)
    print(f"Nombre total d'images trouvées: {total_images}")
    print(f"Images déjà téléchargées: {already_downloaded}")
    print(f"Images téléchargées avec succès: {downloaded}")
    print(f"Nombre d'erreurs: {errors}")

    if errors > 0 and error_list:
        print("\nErreurs rencontrées:")
        for filename, error in error_list[:10]:  # Afficher les 10 premières erreurs
            print(f"  - {filename}: {error}")
        if len(error_list) > 10:
            print(f"  ... et {len(error_list) - 10} autres erreurs")

    print(f"\nDossier des images: {os.path.abspath(IMAGES_DIR)}")
    print("="*60)

if __name__ == "__main__":
    main()

