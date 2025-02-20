import pytest
from flask_api import app

from config import Config

config = Config()

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def test_home_message(client):
    expected_message = f"When other men blindly follow the truth, remember, nothing is true.\
 When other men are bounded by morality and law, remember, everything is permitted.\
 \n -- Niccolò Machiavelli ft Ezio Auditore {config.application_version} --"

    response = client.get('/')
    assert response.status_code == 200
    assert response.data.decode('utf-8') == expected_message
