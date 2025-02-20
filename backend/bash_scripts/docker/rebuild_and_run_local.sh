#!/bin/bash

# Define the Docker Compose project name
PROJECT_NAME="fire_audio_services1"

# Define the environment file
ENV_FILE="/home/kor/Documents/Firebay--studios/product/firebay--studios--backend/.devcontainer/.env"
NUM_CELERY_WORKERS=1
# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "Docker does not seem to be running, make sure Docker is running and try again."
    exit 1
fi

# Build and start the containers, explicitly specifying the .env file
# Also, scale the celery_worker service to NUM_CELERY_WORKERS instances
echo "Building and starting containers, scaling celery_worker to $NUM_CELERY_WORKERS instances..."
docker-compose --env-file "$ENV_FILE" -p "$PROJECT_NAME" up --build -d --scale celery_worker=$NUM_CELERY_WORKERS

# Check if the containers started successfully
if [ $? -eq 0 ]; then
    echo "Containers and scaled celery_worker instances started successfully."
else
    echo "There was an error starting the containers or scaling celery_worker instances."
    exit 1
fi
