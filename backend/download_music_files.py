import os
import requests
from firebase_admin import firestore
from dotenv import load_dotenv
from utils import initialize_firebase
from tqdm import tqdm

# Load environment variables from .env file
load_dotenv()


def download_music_files_from_collection():
    collection_name = "background_music"
    music_directory = "/code/data/background_music"
    # Initialize Firebase
    initialize_firebase()

    # Access Firestore
    db = firestore.client()

    # Fetch documents from Firestore
    collection_ref = db.collection(collection_name)
    docs = collection_ref.stream()

    base_url = os.getenv('BACKGROUND_MUSIC_URL')
    if not base_url:
        raise ValueError("BACKGROUND_MUSIC_URL environment variable is not set.")

    # Prepare list of file names
    music_filenames = [doc.get('background_music_filename') for doc in docs if doc.get('background_music_filename')]

    # Check if the directory is empty
    if not os.listdir(music_directory):
        print('\n---Downloading background music files---\n')
        for filename in tqdm(music_filenames, desc="Downloading files", unit="file"):
            file_url = base_url + filename.replace(' ', '%20')
            response = requests.get(file_url)
            if response.status_code == 200:
                with open(os.path.join(music_directory, filename), 'wb') as music_file:
                    music_file.write(response.content)
                print(f"Downloaded {filename}")
        print("MP3 files downloaded.")
    else:
        print("Background music directory is not empty, skipping download.")

if __name__ == "__main__":
    download_music_files_from_collection()
