#!/bin/bash

# Wake-on-LAN Web Dashboard Upgrade Script
echo "==== Wake-on-LAN Web Dashboard Upgrade ===="
echo "This script will update your installation to the latest version."
echo "Your device configurations will be preserved."

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "Docker is not running. Please start Docker first."
    exit 1
fi

# Stop the existing container
echo "Stopping existing containers..."
docker-compose down

# Backup the configuration
echo "Backing up configuration..."
if [ -d "config" ]; then
    mkdir -p config_backup
    cp -r config/* config_backup/
    echo "Configuration backed up to ./config_backup/"
fi

# Pull latest changes (if using git)
if [ -d ".git" ]; then
    echo "Updating from git repository..."
    git pull
else
    echo "This is not a git repository. Manual update required."
fi

# Rebuild the container
echo "Rebuilding containers with latest version..."
docker-compose build --no-cache

# Start the updated container
echo "Starting updated containers..."
docker-compose up -d

# Check if the container started successfully
if [ $? -eq 0 ]; then
    echo "Wake-on-LAN Web Dashboard has been updated and is running!"
    echo "Access the dashboard at http://localhost:5000"
else
    echo "Failed to start the container. Please check the logs with 'docker-compose logs'."
    exit 1
fi
