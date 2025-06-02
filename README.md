# Wake-on-LAN Web Application

A modern, beautiful web interface for managing Wake-on-LAN functionality with network device discovery and monitoring.

![WOL Dashboard](https://via.placeholder.com/800x450.png?text=Wake-on-LAN+Dashboard)

## Features

- 🖥️ **Device Management**: Add, edit, and remove network devices
- 🔍 **Network Scanning**: Automatic discovery of devices on your network
- ⚡ **Wake-on-LAN**: Send magic packets to wake up sleeping devices
- 📊 **Real-time Status**: Monitor device online/offline status
- 🎨 **Beautiful UI**: Modern, responsive design with dark/light theme
- 🐳 **Docker Ready**: Complete containerization with Docker Compose

## Quick Start with Docker

### Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop/) installed and running
- [Docker Compose](https://docs.docker.com/compose/install/) (usually included with Docker Desktop)

### Installation

1. Clone or download this repository
2. Navigate to the repository folder
3. Run with Docker Compose:

```bash
# Linux/macOS
./start.sh

# Windows PowerShell
.\start.ps1
```

4. Access the application at `http://localhost:5000`

### Updating

To update to the latest version:

```bash
# Linux/macOS
./update.sh

# Windows PowerShell
.\update.ps1
```

## Manual Installation

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Install nmap (required for network scanning):
   - **Ubuntu/Debian**: `sudo apt-get install nmap`
   - **CentOS/RHEL**: `sudo yum install nmap`
   - **macOS**: `brew install nmap`
   - **Windows**: Download from https://nmap.org/download.html

3. Run the application:
   ```bash
   python app.py
   ```

## Project Structure
  ```web-wol/
  ├── app.py                        # Main Flask application
  ├── Dockerfile                    # Docker configuration
  ├── docker-compose.yml            # Docker Compose setup
  ├── docker-entrypoint.sh          # Container initialization script
  ├── requirements.txt              # Python dependencies
  ├── start.sh                      # Linux/macOS startup script
  ├── update.sh                     # Linux/macOS update script
  ├── README.md                     # Documentation
  ├── .gitignore                    # Git exclusion settings
  ├── .dockerignore                 # Docker build exclusions
  ├── config/                       # Device configuration storage
  │   └── devices.json              # Default device configuration
  ├── static/                       # Static web assets
  │   ├── css/                      # Stylesheets
  │   │   └── style.css             # Custom styling
  │   │   └── pico.pumpkin.min.css  # Pico styling 
  │   ├── js/                       # JavaScript files
  │   │   └── app.js                # Frontend functionality
  │   ├── tailscale-pumpkin.png     # icon
  └── templates/                    # HTML templates
      └── index.html                # Main dashboard template
  ```

## Docker Customization

You can customize the Docker setup by editing the `docker-compose.yml` file:

### Changing the Port

To use a different port (e.g., 8080 instead of 5000):

```yaml
ports:
  - "8080:5000"
```

### Persistent Storage

The application stores device configurations in the `./config` directory, which is mounted as a volume in the container:

```yaml
volumes:
  - ./config:/app/config
```

### Network Mode

The application uses `host` network mode to allow proper network scanning and Wake-on-LAN functionality. This is necessary because:

1. WOL magic packets need to be sent as broadcast packets on the local network
2. Network scanning needs direct access to the host network

## Usage

### Adding Devices
1. Click "Add Device" button
2. Enter device name, IP address, and MAC address
3. Click "Save" to add the device

### Network Scanning
1. Click "Scan Network" to discover active devices
2. The application will update device statuses automatically

### Wake-on-LAN
1. Ensure the target device supports WOL and is properly configured
2. Click "Wake Up" button next to offline devices
3. The magic packet will be sent to wake the device

### Discovery Mode
1. Click "Discover New" to find devices on your network
2. Add discovered devices directly from the results

## Configuration

Device configurations are stored in `config/devices.json`. The format is:

```json
[
  {
    "id": "unique-id",
    "name": "Device Name",
    "ip": "192.168.1.100",
    "mac": "AA:BB:CC:DD:EE:FF",
    "status": "offline",
    "last_seen": "2025-05-30T12:00:00.000Z"
  }
]
```

## Network Requirements

- The application needs to run on the same network as the devices you want to manage
- For Docker deployment, `network_mode: host` is used to ensure proper network access
- WOL packets are sent as UDP broadcasts on port 9

## Security Notes

- This application is intended for use on trusted local networks
- No authentication is implemented by default
- Consider adding authentication for production deployments

## Customization

- Edit `static/css/style.css` to customize the appearance
- Modify `templates/index.html` to add custom UI elements
- Update `app.py` to add new functionality

## Troubleshooting

### WOL Not Working
1. Ensure the target device has WOL enabled in BIOS/UEFI
2. Check that the network adapter supports WOL
3. Verify the MAC address is correct
4. Ensure the device is connected via Ethernet (WiFi WOL is unreliable)

### Network Scanning Issues
1. Ensure nmap is installed and accessible
2. Check that the application has necessary network permissions
3. Verify the network range in the scan function matches your network

### Docker Container Not Starting
1. Check Docker logs: `docker-compose logs`
2. Ensure ports are not already in use
3. Verify Docker has network access

## Development

### Building the Docker Container

```bash
docker-compose build
```

### Running in Development Mode

```bash
# Set environment variable for Flask development mode
export FLASK_ENV=development

# Update the build
./update.sh

# Run Flask development server
python app.py
```

## License

MIT License - feel free to use and modify as needed.


CSS style sheet is supported by:
 * Pico CSS ✨ v2.1.1 (https://picocss.com)
 * Copyright 2019-2025 - Licensed under MIT
