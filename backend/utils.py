import os
import base64
import json
import firebase_admin
from datetime import datetime
import hashlib
import subprocess
import tempfile
import math

from dotenv import load_dotenv
from firebase_admin import credentials
from flask import request, jsonify
from functools import wraps
from firebase_admin import firestore
from tqdm import tqdm
import requests
from elevenlabs.client import ElevenLabs
from elevenlabs.types import VoiceSettings


from pydub import AudioSegment
from pydub.silence import split_on_silence
import io
import boto3

from config import Config

config = Config()

load_dotenv()

client = ElevenLabs(
  api_key=config.ELEVENLABS_API_KEY,
)

def initialize_firebase():
    if not config.FIREBASE_SERVICE_KEY:
        raise ValueError("Firebase service key not found in environment variables")
    if not firebase_admin._apps:
        # config.FIREBASE_SERVICE_KEY was a JSON originally so we need to decode it
        decoded_bytes = base64.b64decode(config.FIREBASE_SERVICE_KEY)
        decoded_string = decoded_bytes.decode('utf-8')
        service_account_info = json.loads(decoded_string)

        cred = credentials.Certificate(service_account_info)
        firebase_admin.initialize_app(cred)

def adjust_music_length_to_voiceover(music_path, voiceover_path, output_music_path):
    music = AudioSegment.from_file(music_path)
    voiceover = AudioSegment.from_file(voiceover_path)

    voiceover_duration = len(voiceover)
    music_duration = len(music)

    if music_duration < voiceover_duration:
        # Loop the music to match the voiceover duration
        repeat_times = math.ceil(voiceover_duration / music_duration)
        adjusted_music = music * repeat_times # This might not be the best but this event is highly unlikely to happen.
    else:
        adjusted_music = music

    # Trim the music to match the voiceover duration
    adjusted_music = adjusted_music[:voiceover_duration]

    # Export the adjusted music
    adjusted_music.export(output_music_path, format="wav")


def voice_music_mixer(voice_file_path, music_file_path, ad_length, music_vol, output_file_path="combined_output.mp3"):
    """
    Mixes voice and music audio files, adjusting the volume of the music and ensuring both files
    are of the same length by adding silence if necessary. Applies fade in/out effects to the music.

    Parameters:
    voice_file_path (str): The path to the voice audio file.
    music_file_path (str): The path to the music audio file.
    ad_length (int): The target length of the combined audio in seconds.
    music_vol (float): The volume level to set for the music. A value between 0 and 1.
    output_file_path (str): The path to save the combined audio file.
    """
    if not 0 <= music_vol <= 1:
        raise ValueError("music_vol must be between 0 and 1")

    try:
        # Load voice file
        voice_audio = AudioSegment.from_file(voice_file_path)

        # Load music file and convert it to WAV with 192 kbps
        music_audio = AudioSegment.from_file(music_file_path)
        music_io = io.BytesIO()
        music_audio.export(music_io, format="wav", bitrate="192k")
        music_io.seek(0)
        music_audio = AudioSegment.from_file(music_io, format="wav")

        # Resample audio to the same sample rate if needed
        if voice_audio.frame_rate != music_audio.frame_rate:
            voice_audio = voice_audio.set_frame_rate(music_audio.frame_rate)

        # Set target length in milliseconds
        target_length_ms = int(ad_length * 1000)

        # Adjust the length of the voice audio
        if len(voice_audio) > target_length_ms:
            voice_audio = voice_audio[:target_length_ms]
        else:
            silence = AudioSegment.silent(duration=target_length_ms - len(voice_audio))
            voice_audio = voice_audio + silence

        # Adjust the length of the music audio
        if len(music_audio) > target_length_ms:
            music_audio = music_audio[:target_length_ms]
        else:
            silence = AudioSegment.silent(duration=target_length_ms - len(music_audio))
            music_audio = music_audio + silence

        # Apply music volume adjustments
        music_audio = music_audio + (music_vol * 30 - 30)  # Adjust music volume in dB scale

        # Apply fade in and fade out effects
        fade_in_duration = 5000  # Fade duration in milliseconds
        fade_out_duration = 5000  # Fade duration in milliseconds
        music_audio = music_audio.fade_in(fade_in_duration).fade_out(fade_out_duration)

        # Combine voice and music audio
        combined_audio = voice_audio.overlay(music_audio)

        # Export combined audio to the output file path
        combined_audio.export(output_file_path, format="mp3", bitrate="192k")
        
        print(f"Combined audio file saved as {output_file_path}")

    except Exception as e:
        print(f"An error occurred: {str(e)}")

def generate_voiceover_from_history_item_id(history_item_id):
    try:
        if history_item_id.split('_')[0] == 'pyro':
            bucket_name ='workingdir--storage'
            object_name =f"primary--distribution/{history_item_id}"
            return _download_audio_from_s3(bucket_name, object_name)
        else:
            mp3_data_generator = client.history.get_audio(
            history_item_id=history_item_id,
        )
            mp3_data = b"".join(mp3_data_generator)
            return convert_mp3_data_to_audio_segment(mp3_data)
    except Exception as e:
        print(f"Failed to fetch the voiceover. Error: {e}")

def generate_voiceover_from_voice_id(text_input, voice_id, model_id, output_format="mp3_44100_192", intonation_consistency=0.5):
    try:
        audio_generator = client.generate(
            text=text_input,
            voice=voice_id,
            model=model_id,
            output_format=output_format,
            voice_settings=VoiceSettings(
            stability=intonation_consistency, 
            similarity_boost=0.75, 
    ),
        )
        audio = b"".join(audio_generator)
        return convert_mp3_data_to_audio_segment(audio)
    except Exception as e:
        print(f"Failed to generate the voiceover. Error: {e}")
        return None

def generate_timestamped_filename(base_name, user_id, extension=".mp3"):
    """
    Generate a timestamped filename in the format: base_name_user_id_timestamp.extension
    """
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    return f"{base_name}_{user_id}_{timestamp}{extension}"

def cleanup_workdir():
    data_folder = 'data/workdir'
    try:
        for filename in os.listdir(data_folder):
            file_path = os.path.join(data_folder, filename)
            os.remove(file_path)
            print(f"{file_path} deleted")
    except Exception as e:
        print(f"Failed to delete some files: {str(e)}")
    print("Data folder content after removal :", os.listdir('data'))

def require_api_key(API_KEY):
    def decorator(view_function):
        @wraps(view_function)
        def decorated_function(*args, **kwargs):
            if request.headers.get('X-API-KEY') and request.headers.get('X-API-KEY') == API_KEY:
                return view_function(*args, **kwargs)
            else:
                return jsonify({"error": "Unauthorized"}), 401
        return decorated_function
    return decorator


def download_music_files_helper():
    collection_name = "background_music"
    music_directory = "/code/data/background_music"
    preview_directory = "/code/data/background_music_previews"

    # Create the directories if they don't exist
    for directory in [music_directory, preview_directory]:
        if not os.path.exists(directory):
            os.makedirs(directory)
            print(f"Created directory: {directory}")

    # Initialize Firebase
    initialize_firebase()

    # Access Firestore
    db = firestore.client()

    # Fetch documents from Firestore
    collection_ref = db.collection(collection_name)
    docs = collection_ref.stream()

    base_url = config.BACKGROUND_MUSIC_URL

    # Process documents
    music_filenames = []
    preview_filenames = []
    for doc in docs:
        if doc.get('background_music_filename'):
            music_filenames.append(doc.get('background_music_filename'))
        if doc.get('preview_filename'):
            preview_filenames.append(doc.get('preview_filename'))


    print('\n---Checking and downloading background music files---\n')
    for filename in tqdm(music_filenames, desc="Processing music files", unit="file"):
        # Download music files
        _download_file(filename, music_directory, base_url)

    print('\n---Checking and downloading preview files---\n')
    base_url = config.MUSIC_PREVIEW_URL
    for filename in tqdm(preview_filenames, desc="Processing preview files", unit="file"):
        # Download preview files
        _download_file(filename, preview_directory, base_url)

    print("Music and preview library update complete.")

def _download_file(filename, directory, base_url):
    file_path = os.path.join(directory, filename)

    if not os.path.exists(file_path):
        file_url = base_url + filename.replace(' ', '%20')
        response = requests.get(file_url)

        if response.status_code == 200:
            with open(file_path, 'wb') as file:
                file.write(response.content)
            print(f"Downloaded {filename}")
    else:
        print(f"File {filename} already exists, skipping download.")


def change_audio_volume(input_file_path, output_file_path, volume):
    """
    Changes the volume of an audio file and saves the result to a new file.

    Parameters:
    input_file_path (str): The path to the input audio file.
    output_file_path (str): The path to save the output audio file.
    volume (float): The volume level to set. A value of 1.0 keeps the original volume.
                    Values greater than 1.0 amplify the volume, and values between 0 and 1.0 reduce it.
    """
    if not 0 <= volume <= 1:
        raise ValueError("volume must be between 0 and 1")

    try:
        # Load the audio file
        audio = AudioSegment.from_file(input_file_path)

        # Adjust volume
        adjusted_audio = audio + (volume * 30 - 30)  # Adjust music volume in dB scale

        # Export the adjusted audio
        adjusted_audio.export(output_file_path, format="wav")
        print(f"Volume adjusted audio saved as {output_file_path}")

    except Exception as e:
        print(f"An error occurred: {str(e)}")

def convert_mp3_data_to_audio_segment(mp3_data):
    """Convert MP3 data to a PyDub AudioSegment object, set the bitrate to 192k wav."""
    audio_segment = AudioSegment.from_file(io.BytesIO(mp3_data), format="mp3")

    output = io.BytesIO()
    audio_segment.export(output, format="wav", bitrate="192k")
    output.seek(0)
    audio_segment = AudioSegment.from_file(output, format="wav")

    return audio_segment

def slice_audio_at_cutoff(audio_segment, cutoff_ms):
    """
    Slices the audio segment so that the new audio starts at the cutoff millisecond timestamp.
    
    Parameters:
    audio_segment (AudioSegment): The original audio segment.
    cutoff_ms (int): The cutoff timestamp in milliseconds.
    
    Returns:
    AudioSegment: The sliced audio segment starting from the cutoff timestamp.
    """
    # Slice the audio segment from the cutoff timestamp
    sliced_audio = audio_segment[cutoff_ms:]
    

    # Export the sliced audio to memory with a bitrate of 192 kbps
    output = io.BytesIO()
    sliced_audio.export(output, format="wav", bitrate="192k")
    output.seek(0)
    
    # Load the audio back from memory
    final_audio = AudioSegment.from_file(output, format="wav")
    
    return final_audio

def process_audio_to_remove_pauses(audio_segment, threshold_db=-40, min_silence_duration=100):
    """Process the audio data to remove all silences."""
    chunks = split_on_silence(audio_segment, 
                              min_silence_len=min_silence_duration,
                              silence_thresh=threshold_db)
    non_silent_audio = sum(chunks, AudioSegment.empty())

    output = io.BytesIO()
    non_silent_audio.export(output, format="wav", bitrate="192k")
    output.seek(0)
    non_silent_audio = AudioSegment.from_file(output, format="wav")

    return non_silent_audio

def stitch_audio_segments(audio_segments):
    """Combine multiple audio segments and return as a single audio segment."""
    combined_audio = sum(audio_segments, AudioSegment.empty())

    output = io.BytesIO()
    combined_audio.export(output, format="wav", bitrate="192k")
    output.seek(0)
    combined_audio = AudioSegment.from_file(output, format="wav")

    return combined_audio

def append_pause(audio_segment, duration=200):
    """
    Adds an artificial pause to the end of the given audio segment.

    Args:
    audio_segment (AudioSegment): The audio segment to which the pause will be added.
    duration (int, optional): The duration of the pause in milliseconds. Default is 200 milliseconds.

    Returns:
    AudioSegment: The modified audio segment with the pause added.
    """
    pause = AudioSegment.silent(duration=duration)  # duration in milliseconds
    audio_segment_with_pause = audio_segment + pause

    output = io.BytesIO()
    audio_segment_with_pause.export(output, format="wav", bitrate="192k")
    output.seek(0)
    audio_segment_with_pause = AudioSegment.from_file(output, format="wav")

    return audio_segment_with_pause

def immediate_file_cleanup(file_paths):
    for file_path in file_paths:
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
                print(f"{file_path} deleted")
            except Exception as e:
                print(f"Failed to delete {file_path} immediately. Error: {str(e)} will be cleaned up by daily cron job.")
    print("Data folder content after removal :", os.listdir('data'))


def upload_audio_segment_to_s3(audio_segment, bucket_name, object_name):
    """
    Upload an AudioSegment to an S3 bucket directly from memory.

    :param audio_segment: AudioSegment object to upload.
    :param bucket_name: Name of the S3 bucket to upload to.
    :param object_name: Object name in S3. This is the file name that will appear in the bucket.
    :return: True if the audio segment was uploaded successfully, else False.
    """
    s3_client = boto3.client('s3', aws_access_key_id=config.MIN_PYRO_USER_AWS_ACCESS_KEY,
                             aws_secret_access_key=config.MIN_PYRO_USER_AWS_SECRET_KEY, region_name='us-east-2')

    buffer = io.BytesIO()
    # Adjust format and parameters as needed
    audio_segment.export(buffer, format="mp3", bitrate="192k")
    buffer.seek(0)  # Reset buffer's position to the beginning

    try:
        s3_client.put_object(Body=buffer, Bucket=bucket_name, Key=object_name, ContentType='audio/mpeg')
        print(f"Audio uploaded to {bucket_name}/{object_name}")
        return True
    except Exception as e:
        print(f"Error uploading audio: {e}")
        return False


def _download_audio_from_s3(bucket_name, object_name):
    """
    Download an audio file from an S3 bucket directly into memory and return it as an AudioSegment object with a bit rate of 192 kbps.

    :param bucket_name: Name of the S3 bucket to download from.
    :param object_name: Object name in S3. This is the file name that will appear in the bucket.
    :return: AudioSegment object if the audio was downloaded successfully, else None.
    """
    s3_client = boto3.client('s3', aws_access_key_id=config.MIN_PYRO_USER_AWS_ACCESS_KEY,
                             aws_secret_access_key=config.MIN_PYRO_USER_AWS_SECRET_KEY)
    
    try:
        obj = s3_client.get_object(Bucket=bucket_name, Key=object_name)
        audio_data = obj['Body'].read()

        # Create an AudioSegment from the downloaded audio data
        audio_segment = AudioSegment.from_file(io.BytesIO(audio_data), format="mp3")

        # Export to in-memory file-like object with the specified bit rate
        output_io = io.BytesIO()
        audio_segment.export(output_io, format="wav", bitrate="192k")
        
        # Move the buffer cursor to the beginning
        output_io.seek(0)

        # Reload the audio segment to ensure the bit rate is set correctly
        audio_segment = AudioSegment.from_file(output_io, format="wav")
        
        print(f"Audio downloaded from {bucket_name}/{object_name} and ready for processing with 192 kbps bit rate")
        return audio_segment
    except Exception as e:
        print(f"Error downloading audio: {e}")
        return None


def moodify_script(initial_script, voice_gender='male', emotion="enthusiastically"):
    if voice_gender == 'male':
        pronoun = 'He'
    else:
        pronoun = 'She'
    mood_phrase = f'{pronoun} said {emotion} <break time="0.8s" />'

    return f'{mood_phrase} "{initial_script}"'


def generate_pyro_history_item_id(input_string):
    """
    Generates a 7-digit alphanumeric ID for a Pyro history item based on the input string.
    
    Parameters:
    - input_string (str): The string to encode into a 7-digit alphanumeric ID.
    
    Returns:
    - str: A 7-digit alphanumeric ID.
    """
    hash_object = hashlib.sha256(input_string.encode())
    hex_dig = hash_object.hexdigest()
    return hex_dig[:7]


def adjust_speech_rate(audio_segment, tempo_change):
    """
    Adjust the tempo of an audio segment.

    Parameters:
    - audio_segment: A PyDub AudioSegment instance.
    - tempo_change: The percentage to change the tempo by. Positive values increase the tempo,
      while negative values decrease it.

    Returns:
    - A new AudioSegment instance with the adjusted tempo and 192k bitrate.
    """
    # Create a temporary WAV file for the original audio
    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_wav_file:
        original_wav_path = temp_wav_file.name
        audio_segment.export(temp_wav_file.name, format="wav")
    
    # Prepare the output WAV file path
    output_wav_path = tempfile.mktemp(suffix='.wav')

    # Apply Tempo Change with SoundTouch
    subprocess.run(["soundstretch", original_wav_path, output_wav_path, f"-tempo={tempo_change}"], check=True)

    # Load the processed WAV file into an AudioSegment
    final_audio_segment = AudioSegment.from_file(output_wav_path, format="wav")

    # Set the sample rate to match the original audio segment
    final_audio_segment = final_audio_segment.set_frame_rate(audio_segment.frame_rate)

    # Cleanup: Remove Temporary Files
    subprocess.run(["rm", original_wav_path], check=True)
    subprocess.run(["rm", output_wav_path], check=True)

    # Export the final audio segment to a byte buffer with the desired bitrate
    buffer = io.BytesIO()
    final_audio_segment.export(buffer, format="wav", bitrate="192k")
    buffer.seek(0)

    # Load the audio segment from the byte buffer
    final_audio_segment_with_bitrate = AudioSegment.from_file(buffer, format="wav")

    return final_audio_segment_with_bitrate

def convert_wav_to_mp3_audio_segment(wav_audio_segment):
    """
    Convert a PyDub AudioSegment object in WAV format to an MP3 AudioSegment object with a bitrate of 192 kbps.
    
    Parameters:
    wav_audio_segment (AudioSegment): The original WAV audio segment.
    
    Returns:
    AudioSegment: The converted MP3 audio segment with a bitrate of 192 kbps.
    """
    # Export the WAV audio segment to memory in MP3 format with a bitrate of 192 kbps
    output = io.BytesIO()
    wav_audio_segment.export(output, format="mp3", bitrate="192k")
    output.seek(0)

    # Load the MP3 audio segment back from memory
    mp3_audio_segment = AudioSegment.from_file(output, format="mp3")

    return mp3_audio_segment






