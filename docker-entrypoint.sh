#!/bin/bash
# Container initialization script

echo "Initializing container..."

# Ensure config directory exists and has correct permissions
mkdir -p /app/config
chmod 755 /app/config

# Create default config if it doesn't exist
if [ ! -f /app/config/devices.json ]; then
    echo "Creating default device configuration..."
    echo '[]' > /app/config/devices.json
fi

# Execute the command passed to this script
exec "$@"
