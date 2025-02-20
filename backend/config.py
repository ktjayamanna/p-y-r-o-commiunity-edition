# Relative path: config.py
from dataclasses import dataclass, field
from dotenv import load_dotenv
import os

@dataclass
class Config:
    dotenv_path: str = field(default_factory=lambda: os.path.join(os.path.dirname(__file__), '.devcontainer', '.env'))
    broker_url: str = field(init=False)
    result_backend: str = None  # Specify if you have a result backend
    accept_content: list = field(default_factory=lambda: ['json'])
    task_serializer: str = 'json'
    result_serializer: str = 'json'
    MIN_PYRO_USER_AWS_ACCESS_KEY: str = field(init=False)
    MIN_PYRO_USER_AWS_SECRET_KEY: str = field(init=False)
    ELEVENLABS_API_KEY: str = field(init=False)
    FIREBAY_MUSIC_UPDATE_KEY: str = field(init=False)
    FIREBASE_SERVICE_KEY: str = field(init=False)
    MOOD_INTERVAL: int = field(init=False)
    application_version: str = field(init=False)  # New field for version
    BACKGROUND_MUSIC_URL: str = field(init=False)
    MUSIC_PREVIEW_URL: str = field(init=False)

    def __post_init__(self):
        load_dotenv(self.dotenv_path)
        self.broker_url = os.getenv("BROKER_URL")
        self.broker_transport_options = {'region': 'us-east-2', "predefined_queues": {
            "celery": {  ## the name of the SQS queue
                "url": os.getenv('SQS_URL'),
                "access_key_id": os.getenv('MIN_PYRO_USER_AWS_ACCESS_KEY'),
                "secret_access_key": os.getenv('MIN_PYRO_USER_AWS_SECRET_KEY'),
            }
        },}
        self.FIREBASE_SERVICE_KEY = os.getenv('FIREBASE_SERVICE_KEY')
        self.MIN_PYRO_USER_AWS_ACCESS_KEY = os.getenv('MIN_PYRO_USER_AWS_ACCESS_KEY')
        self.MIN_PYRO_USER_AWS_SECRET_KEY = os.getenv('MIN_PYRO_USER_AWS_SECRET_KEY')
        self.ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')
        self.FIREBAY_MUSIC_UPDATE_KEY = os.getenv('FIREBAY_MUSIC_UPDATE_KEY')
        self.MOOD_INTERVAL = 2000  # milliseconds
        self.application_version = self.read_version()
        self.BACKGROUND_MUSIC_URL = os.getenv('BACKGROUND_MUSIC_URL')
        self.MUSIC_PREVIEW_URL = os.getenv('MUSIC_PREVIEW_URL')

    def read_version(self):
        # Path to the VERSION file relative to this script
        version_path = os.path.join(os.path.dirname(__file__), 'VERSION')
        with open(version_path, 'r') as file:
            return file.read().strip()

