#Relative path: flask_api.py
import os
from utils import voice_music_mixer, generate_voiceover_from_history_item_id, generate_voiceover_from_voice_id, download_music_files_helper
from utils import generate_timestamped_filename, cleanup_workdir, require_api_key, change_audio_volume
from utils import stitch_audio_segments, process_audio_to_remove_pauses, append_pause, immediate_file_cleanup
from utils import moodify_script, upload_audio_segment_to_s3, generate_pyro_history_item_id, adjust_speech_rate, slice_audio_at_cutoff
from utils import adjust_music_length_to_voiceover
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
from pytz import timezone
from flask import Flask, request, send_file, jsonify
import logging
from config import Config
from celery import Celery
from pydub import AudioSegment  

config = Config()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes for now

scheduler = BackgroundScheduler()
scheduler.start()
scheduler.add_job(cleanup_workdir, 'cron', hour=0, minute=0, timezone=timezone('US/Eastern'))

celery_app_name = "audio_services"
celery = Celery(
    celery_app_name, 
    broker=config.broker_url,
    broker_transport_options=config.broker_transport_options, 
    task_create_missing_queues=False, # If this is set to true, Celery will automatically create a queue in AWS.
    )

celery.conf.update(
    accept_content=config.accept_content,
    task_serializer = config.task_serializer,
    result_serializer = config.result_serializer
)


@app.route('/')
def home():
    return f"When other men blindly follow the truth, remember, nothing is true.\
 When other men are bounded by morality and law, remember, everything is permitted.\
 \n -- Niccolò Machiavelli ft Ezio Auditore {config.application_version} --"

@app.route('/update-music-lib', methods=['GET'])
@require_api_key(config.FIREBAY_MUSIC_UPDATE_KEY)
def download_music_files_from_collection():
    download_music_files_helper()
    return "Music library update completed successfully.", 200

@app.route('/produce-spot', methods=['POST'])
def produce_spot():
    voice_file_path, music_file_path, output_file_path = None, None, None
    adjusted_music_path = None  # Initialize adjusted_music_path to None

    try:
        data = request.get_json()
        logger.info("Received data at produce_spot: %s", data)
        user_id = data.get('user_id')
        history_item_id_list = data.get('history_item_id_list')
        end_of_section_pause_duration_list = data.get('end_of_section_pause_duration_list')
        music_filename = data.get('music_filename', "No Music")
        music_vol = float(data.get('music_vol', 0.1))

        # Step 1: Stitch Sections
        section_voiceover_segments = []
        for history_item_id, end_of_section_pause_duration in zip(history_item_id_list, end_of_section_pause_duration_list):
            end_of_section_pause_duration_milliseconds = end_of_section_pause_duration * 1000
            section_voiceover_segment = _process_section(history_item_id, end_of_section_pause_duration_milliseconds)
            section_voiceover_segments.append(section_voiceover_segment)

        stitched_voiceover = stitch_audio_segments(section_voiceover_segments)

        # Save stitched voiceover to a file
        voice_file_path = f"data/workdir/{generate_timestamped_filename('sectioned_voiceover_', user_id, '.mp3')}"
        stitched_voiceover.export(voice_file_path, format="mp3", bitrate="192k")
        logger.info("Stitched voiceover exported to %s", voice_file_path)

        # Generate S3 object details
        pyro_history_item_id = generate_pyro_history_item_id(generate_timestamped_filename('produced_spot_', user_id, '.mp3'))
        pyro_history_item_id = "pyro_" + pyro_history_item_id
        bucket_name = 'workingdir--storage'
        object_name = f"primary--distribution/{pyro_history_item_id}"

        # Step 2: Check for "No Music" option
        if not music_filename.strip() or music_filename.lower() == "no music":
            # Upload the stitched voiceover directly to S3
            try:
                # Read the audio file into an AudioSegment
                voiceover_audio = AudioSegment.from_file(voice_file_path)
                upload_audio_segment_to_s3(voiceover_audio, bucket_name, object_name)
                logger.info("No music selected. Uploaded voiceover to S3: %s", pyro_history_item_id)
                return jsonify({"pyro_history_item_id": pyro_history_item_id})
            except Exception as e:
                logger.error(f"Failed to upload the audio: {str(e)}")
                return jsonify({"error": "Failed to upload the audio", "details": str(e)}), 500

        # Step 3: Adjust Background Music Length
        music_file_path = f"data/background_music/{music_filename}"
        if not os.path.exists(music_file_path):
            logger.info(f"Music file {music_filename} not found. Initiating download.")
            download_music_files_helper()

        adjusted_music_path = f"data/workdir/{generate_timestamped_filename('adjusted_music_', user_id, '.mp3')}"
        adjust_music_length_to_voiceover(music_file_path, voice_file_path, adjusted_music_path)
        logger.info("Adjusted music length saved to %s", adjusted_music_path)

        # Step 4: Mix Voiceover with Adjusted Music
        output_file_path = f"data/workdir/{generate_timestamped_filename('combined_', user_id, '.mp3')}"

        voice_music_mixer(
            voice_file_path,
            adjusted_music_path,
            len(stitched_voiceover) / 1000,  # Duration in seconds
            music_vol,
            output_file_path=output_file_path
        )
        logger.info("Produced mixed audio stored at %s", output_file_path)

        # Upload the combined audio to S3
        try:
            combined_audio = AudioSegment.from_file(output_file_path)
            upload_audio_segment_to_s3(combined_audio, bucket_name, object_name)
            logger.info("Mixed audio uploaded to S3: %s", pyro_history_item_id)
            return jsonify({"pyro_history_item_id": pyro_history_item_id})
        except Exception as e:
            logger.error(f"Failed to upload the audio: {str(e)}")
            return jsonify({"error": "Failed to upload the audio", "details": str(e)}), 500

    except Exception as e:
        logger.error(f"An error occurred: {str(e)}")
        return {"error": str(e)}, 500

    finally:
            # Cleanup: Delete generated files to free up space
            paths_to_delete = [voice_file_path, output_file_path]
            if adjusted_music_path:
                paths_to_delete.append(adjusted_music_path)
            # Filter out any None values
            paths_to_delete = [path for path in paths_to_delete if path]
            immediate_file_cleanup(paths_to_delete)
            logger.info(f"Cleaned up temporary files: {paths_to_delete}")


@app.route('/generate-mix', methods=['POST'])
def generate_and_mix_audio():
    music_file_path, voice_file_path, output_file_path = None, None, None

    try:
        data = request.get_json()
        logger.info("Received data at generate_and_mix_audio: %s", data)
        music_filename = data.get('music_choice')
        user_id = data.get('user_id')
        ad_length = int(data.get('ad_length'))
        music_vol = float(data.get('music_vol', 0.1))
        history_item_id = data.get('history_item_id', None)
        pyro_history_item_id = data.get('pyro_history_item_id', None)

        if history_item_id:
            logger.info("Generating voiceover from history_item_id: %s", history_item_id)
            voice_file_path = f"data/workdir/{generate_timestamped_filename('script_voiceover', user_id, '.wav')}"
            script_voiceover = generate_voiceover_from_history_item_id(history_item_id)
            script_voiceover.export(voice_file_path, format="wav", bitrate="192k")
            logger.info("Generated voiceover from history_item_id: %s", history_item_id)

        elif pyro_history_item_id:
            logger.info("Generating voiceover from pyro_history_item_id: %s", pyro_history_item_id)
            voice_file_path = f"data/workdir/{generate_timestamped_filename('stitched_voiceover' , user_id, '.wav')}"
            stitched_voiceover = generate_voiceover_from_history_item_id(pyro_history_item_id)
            stitched_voiceover.export(voice_file_path, format="wav", bitrate="192k")
            logger.info("Generated voiceover from pyro_history_item_id: %s", pyro_history_item_id)
        else:
            raise Exception("Either history_item_id or pyro_history_item_id must be provided.")

        music_file_path = f"data/background_music/{music_filename}"
        if not os.path.exists(music_file_path):
            logger.info(f"Music file {music_filename} not found. Initiating download.")
            download_music_files_helper()

        output_file_path = f"data/workdir/{generate_timestamped_filename('combined', user_id, '.mp3')}"
        voice_music_mixer(voice_file_path, music_file_path, ad_length, music_vol, output_file_path=output_file_path)
        logger.info("All mp3 files stored at", os.listdir('data'))

        # Send the combined audio file as response
        response = send_file(output_file_path, as_attachment=True, download_name=f"combined_{user_id}.mp3")

        return response

    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return {"error": str(e)}, 500

    finally:
        # Cleanup: Delete generated files to free up space
        paths_to_delete = [voice_file_path, output_file_path]
        immediate_file_cleanup(paths_to_delete)

@app.route('/stitch-sections', methods=['POST'])
def stitch_sections():
    voice_file_path = None

    try:
        data = request.get_json()
        logger.info("Received data at stitch_sections: %s", data)
        user_id = data.get('user_id')
        history_item_id_list = data.get('history_item_id_list')
        end_of_section_pause_duration_list = data.get('end_of_section_pause_duration_list')
        section_voiceover_segments = []
        voice_file_path = f"data/workdir/{generate_timestamped_filename('sectioned_voiceover_', user_id, '.mp3')}"

        for history_item_id, end_of_section_pause_duration in zip(history_item_id_list, end_of_section_pause_duration_list):
            end_of_section_pause_duration_milliseconds = end_of_section_pause_duration * 1000
            section_voiceover_segment = _process_section(history_item_id, end_of_section_pause_duration_milliseconds )
            section_voiceover_segments.append(section_voiceover_segment)

        stitched_voiceover =stitch_audio_segments(section_voiceover_segments)
        pyro_history_item_id = generate_pyro_history_item_id(generate_timestamped_filename('stitched_voiceover_', user_id, '.wav'))
        pyro_history_item_id = "pyro_" + pyro_history_item_id
        bucket_name='workingdir--storage'
        object_name =f"primary--distribution/{pyro_history_item_id}"

        try:
            upload_audio_segment_to_s3(stitched_voiceover, bucket_name, object_name)
            logger.info("Generated voiceover pyro_history_item_id and uploaded to S3: %s", pyro_history_item_id)
            return jsonify({"pyro_history_item_id": pyro_history_item_id})
        except Exception as e:
            return jsonify({"error": "Failed to upload the audio", "details": str(e)}), 500

    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return {"error": str(e)}, 500

    finally:
        immediate_file_cleanup([voice_file_path])


@app.route('/music_preview_volume_change', methods=['POST'])
def music_preview_volume_change():
    try:
        data = request.get_json()
        logger.info("Received data at music_preview_volume_change: %s", data)
        music_vol = float(data.get('music_vol', 0.10))
        music_choice = data.get('music_choice')
        user_id = data.get('user_id')

        input_file_path = f"data/background_music_previews/{music_choice}"
        if not os.path.exists(input_file_path):
            logger.info(f"Music file {music_choice} not found. Initiating download.")
            download_music_files_helper()
        output_file_path = f"data/workdir/{generate_timestamped_filename('vol_changed', user_id, '.mp3')}"

        change_audio_volume(input_file_path, output_file_path, music_vol)
        logger.info("Changed audio volume at", os.listdir('data'))

        response = send_file(output_file_path, as_attachment=True, download_name=f"vol_changed_{user_id}.mp3")

        return response

    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return {"error": str(e)}, 500

    finally:
        # Cleanup: Delete the generated file to free up space
        immediate_file_cleanup([output_file_path])

@app.route('/preprocess-voiceover', methods=['POST'])
def preprocess_voiceover_endpoint():
    data = request.get_json()
    logger.info("Received data at preprocess_voiceover_endpoint: %s", data)
    
    try:
        script = data.get('script')
        voice = data.get('voice')
        voice_gender = data.get('voice_gender')
        model_id = data.get('model_id', "eleven_multilingual_v2")
        user_id = data.get('user_id')
        speech_rate = float(data.get('speech_rate', 0))
        intonation_consistency = data.get('voice_intonation_consistency', 50)
        intonation_consistency = float(intonation_consistency) / 100
        emotion = data.get('emotion', None)

        logger.info("Parsed data: script=%s, voice=%s, voice_gender=%s, model_id=%s, user_id=%s, dragons_breath_mode=%s, speech_rate=%s, intonation_consistency=%s",
                    script, voice, voice_gender, model_id, user_id, emotion, speech_rate, intonation_consistency)

        if emotion:
            script = moodify_script(script, voice_gender, emotion)
            logger.info("Moodified script: %s", script)
            
            script_voiceover = generate_voiceover_from_voice_id(script, voice, model_id, "mp3_44100_192", intonation_consistency)
            script_voiceover = slice_audio_at_cutoff(script_voiceover, config.MOOD_INTERVAL)
            script_voiceover = process_audio_to_remove_pauses(script_voiceover)
            logger.info("Processed voiceover with Dragon's Breath mode")
        else:
            script_voiceover = generate_voiceover_from_voice_id(script, voice, model_id, "mp3_44100_192", intonation_consistency)
            logger.info("Generated voiceover without Dragon's Breath mode")

        if speech_rate != 0:
            script_voiceover = adjust_speech_rate(script_voiceover, speech_rate)
            logger.info("Adjusted speech rate by %s%%", speech_rate)

        pyro_history_item_id = "pyro_" + generate_pyro_history_item_id(generate_timestamped_filename('processed_voiceover_', user_id, '.wav'))
        object_name = f"primary--distribution/{pyro_history_item_id}"
        bucket_name = 'workingdir--storage'

        upload_audio_segment_to_s3(script_voiceover, bucket_name, object_name)
        logger.info("Uploaded audio segment to S3: bucket=%s, object=%s", bucket_name, object_name)

        return jsonify({'pyro_history_item_id': pyro_history_item_id}), 200

    except Exception as e:
        logger.error("Failed to process or upload the audio", exc_info=True)
        return jsonify({"error": "Failed to process or upload the audio", "details": str(e)}), 500

def _process_section(history_item_id, end_of_section_pause_duration):
    section_voiceover_segment = generate_voiceover_from_history_item_id(history_item_id)
    section_voiceover_segment = process_audio_to_remove_pauses(section_voiceover_segment)
    section_voiceover_segment = append_pause(section_voiceover_segment, duration=end_of_section_pause_duration)
    return section_voiceover_segment

# if __name__ == '__main__':
#     app.run(debug=True, port=5008)
