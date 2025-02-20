import os
import pytest
from unittest.mock import Mock, patch
from utils import cleanup_workdir

@pytest.fixture
def workdir():
    # Setup: create directory and file
    os.makedirs('data/workdir', exist_ok=True)
    test_file = 'data/workdir/test_file.txt'
    with open(test_file, 'w') as f:
        f.write('Test content')
    
    # Provide the test file path to the test function.
    yield test_file

    # Cleanup: remove file and directory
    if os.path.exists(test_file):
        os.remove(test_file)
    if os.path.exists('data/workdir'):
        os.rmdir('data/workdir')

# Define the test function
def test_if_cleanup_workdir_empty_the_working_directory(workdir):
    test_file = workdir
    # Assert that the file exists
    assert os.path.exists(test_file)

    # Execute cleanup
    cleanup_workdir()

    # Assert the file is deleted
    assert not os.path.exists(test_file)


