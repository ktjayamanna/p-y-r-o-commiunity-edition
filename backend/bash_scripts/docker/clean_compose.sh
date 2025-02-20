#!/bin/bash

# Define the Docker Compose project name
PROJECT_NAME="fire_audio_services"

# Define the environment file
ENV_FILE="/home/kor/Documents/Firebay--studios/product/firebay--studios--backend/.devcontainer/.env"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "Docker does not seem to be running, make sure Docker is running and try again."
    exit 1
fi

echo "Stopping and removing containers associated with $PROJECT_NAME..."
# Stop and remove containers, networks, volumes, and images created by `up`.
docker-compose --env-file "$ENV_FILE" -p "$PROJECT_NAME" down --rmi all

# Check if the operation was successful
if [ $? -eq 0 ]; then
    echo "Containers, networks, volumes, and images associated with $PROJECT_NAME have been successfully removed."
else
    echo "There was an error removing the resources associated with $PROJECT_NAME."
    exit 1
fi
