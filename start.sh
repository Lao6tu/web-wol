#!/bin/bash

# Wake-on-LAN Web Dashboard startup script
echo "Starting Wake-on-LAN Web Dashboard..."

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "Docker is not running. Please start Docker first."
    exit 1
fi

# Build and start the Docker container
echo "Building and starting Docker container..."
docker-compose up -d --build

# Check if the container started successfully
if [ $? -eq 0 ]; then
    echo "Wake-on-LAN Web Dashboard is running!"
    echo "Access the dashboard at http://localhost:5000"
else
    echo "Failed to start the container. Please check the logs with 'docker-compose logs'."
    exit 1
fi