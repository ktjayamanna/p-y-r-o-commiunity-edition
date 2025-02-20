#!/bin/bash

# Define the Docker Compose project name
PROJECT_NAME="fire_audio_services"

# Define the environment file
ENV_FILE="/home/kor/Documents/Firebay--studios/product/firebay--studios--backend/.devcontainer/.env"
NUM_CELERY_WORKERS=1

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "Docker does not seem to be running, make sure Docker is running and try again."
    exit 1
fi

# Stop and remove all running containers and volumes for the specified project
docker-compose -p "$PROJECT_NAME" down -v

# Remove all images associated with the specified project
docker-compose -p "$PROJECT_NAME" rm -f

# Prune all unused images, networks, volumes, and build cache
docker system prune -a -f --volumes

# Remove any dangling images
docker image prune -f