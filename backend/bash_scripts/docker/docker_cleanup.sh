#!/bin/bash

# Stop all running containers
docker stop $(docker ps -a -q)

# Remove all containers
docker rm $(docker ps -a -q)

# Remove all images
docker rmi $(docker images -a -q)

# Remove all volumes
docker volume rm $(docker volume ls -q)

# Remove all networks
docker network rm $(docker network ls -q)

# Clean up any dangling images (untagged images)
docker rmi $(docker images -f "dangling=true" -q)

# Remove all unused objects (including containers, images, volumes, and networks)
docker system prune -a --volumes -f

echo "Full Docker cleanup is complete."


