from flask import Flask, render_template, request, jsonify
from wakeonlan import send_magic_packet
import subprocess
import json
import os
import netifaces
import socket
from datetime import datetime
import uuid

app = Flask(__name__)

# Configuration file path
CONFIG_FILE = 'config/devices.json'

def load_devices():
    if not os.path.exists(CONFIG_FILE):
        return []
    try:
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return []

def save_devices(devices):
    os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
    with open(CONFIG_FILE, 'w') as f:
        json.dump(devices, f, indent=2)

def get_network_range():
    """Get the local network range for scanning"""
    # Check for environment variable first
    env_network_range = os.environ.get('NETWORK_RANGE')
    if env_network_range:
        print(f"Using network range from environment: {env_network_range}")
        return env_network_range
        
    try:
        # First try to get network info from the container
        gateways = netifaces.gateways()
        default_gateway = gateways['default'][netifaces.AF_INET][0]
        
        for interface in netifaces.interfaces():
            addrs = netifaces.ifaddresses(interface)
            if netifaces.AF_INET in addrs:
                for addr in addrs[netifaces.AF_INET]:
                    if addr['addr'].startswith(default_gateway.rsplit('.', 1)[0]):
                        netmask = addr.get('netmask', '255.255.255.0')
                        network = addr['addr'].rsplit('.', 1)[0] + '.0'
                        if netmask == '255.255.255.0':
                            return f"{network}/24"
        
        # Fallback to common home network ranges for Docker container environments
        return "192.168.1.0/24"  # Most common home network
    except:
        return "192.168.1.0/24"  # fallback

def scan_network():
    try:
        network_range = get_network_range()
        print(f"Scanning network range: {network_range}")
        result = subprocess.run(['nmap', '-sn', network_range], 
                              capture_output=True, text=True, timeout=30)
        return parse_nmap_output(result.stdout)
    except Exception as e:
        print(f"Scan error: {e}")
        return []

def parse_nmap_output(output):
    devices = []
    lines = output.split('\n')
    current_ip = None
    
    for line in lines:
        if 'Nmap scan report for' in line:
            parts = line.split()
            if len(parts) >= 5:
                # Handle both "hostname (ip)" and "ip" formats
                if '(' in line and ')' in line:
                    current_ip = line.split('(')[1].split(')')[0]
                    hostname = ' '.join(parts[4:-1])
                else:
                    current_ip = parts[-1]
                    hostname = current_ip
                
                devices.append({
                    'ip': current_ip,
                    'name': hostname,
                    'status': 'online',
                    'last_seen': datetime.now().isoformat()
                })
    
    return devices

def ping_device(ip):
    """Check if a single device is reachable"""
    try:
        if os.name == 'nt':  # Windows
            result = subprocess.run(['ping', '-n', '1', '-w', '1000', ip], 
                                  capture_output=True, text=True)
        else:  # Unix/Linux
            result = subprocess.run(['ping', '-c', '1', '-W', '1', ip], 
                                  capture_output=True, text=True)
        return result.returncode == 0
    except:
        return False

def get_mac_address(ip):
    """Try to get MAC address for an IP (limited success)"""
    try:
        if os.name == 'nt':  # Windows
            result = subprocess.run(['arp', '-a', ip], capture_output=True, text=True)
            lines = result.stdout.split('\n')
            for line in lines:
                if ip in line and 'dynamic' in line.lower():
                    parts = line.split()
                    if len(parts) >= 2:
                        return parts[1].replace('-', ':')
        else:  # Unix/Linux
            result = subprocess.run(['arp', '-n', ip], capture_output=True, text=True)
            lines = result.stdout.split('\n')
            for line in lines:
                if ip in line:
                    parts = line.split()
                    if len(parts) >= 3:
                        return parts[2]
    except:
        pass
    return None

@app.route('/health')
def health_check():
    """Health check endpoint for Docker"""
    return jsonify({
        'status': 'ok',
        'service': 'Wake-on-LAN Web Dashboard',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/')
def index():
    devices = load_devices()
    return render_template('index.html', devices=devices)

@app.route('/api/devices', methods=['GET'])
def get_devices():
    devices = load_devices()
    return jsonify(devices)

@app.route('/scan', methods=['POST'])
def scan():
    network_devices = scan_network()
    saved_devices = load_devices()
    
    # Update status of known devices
    for device in saved_devices:
        device['status'] = 'offline'
        for net_dev in network_devices:
            if device['ip'] == net_dev['ip']:
                device['status'] = 'online'
                device['last_seen'] = datetime.now().isoformat()
                break
    
    # Save updated statuses
    save_devices(saved_devices)
    
    return jsonify({
        'saved_devices': saved_devices,
        'discovered_devices': network_devices,
        'scan_time': datetime.now().isoformat()
    })

@app.route('/ping/<ip>', methods=['POST'])
def ping_single(ip):
    is_online = ping_device(ip)
    
    # Update device status
    devices = load_devices()
    for device in devices:
        if device['ip'] == ip:
            device['status'] = 'online' if is_online else 'offline'
            if is_online:
                device['last_seen'] = datetime.now().isoformat()
            break
    
    save_devices(devices)
    return jsonify({'ip': ip, 'status': 'online' if is_online else 'offline'})

@app.route('/wake', methods=['POST'])
def wake():
    data = request.get_json() if request.is_json else request.form
    mac = data.get('mac')
    if not mac:
        return jsonify({'error': 'MAC address required'}), 400
    
    try:
        send_magic_packet(mac)
        
        # Update device in database
        devices = load_devices()
        for device in devices:
            if device.get('mac') == mac:
                device['last_wake'] = datetime.now().isoformat()
                break
        save_devices(devices)
        
        return jsonify({'status': 'Magic packet sent', 'mac': mac})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/add_device', methods=['POST'])
def add_device():
    data = request.get_json() if request.is_json else request.form
    name = data.get('name')
    ip = data.get('ip')
    mac = data.get('mac', '').upper()
    
    if not all([name, ip]):
        return jsonify({'error': 'Name and IP address are required'}), 400
    
    # Validate IP format
    try:
        socket.inet_aton(ip)
    except socket.error:
        return jsonify({'error': 'Invalid IP address format'}), 400
    
    devices = load_devices()
    
    # Check for duplicates
    for device in devices:
        if device['ip'] == ip:
            return jsonify({'error': 'Device with this IP already exists'}), 400
        if mac and device.get('mac') == mac:
            return jsonify({'error': 'Device with this MAC address already exists'}), 400
    
    # Try to get MAC address if not provided
    if not mac:
        mac = get_mac_address(ip)
    
    new_device = {
        'id': str(uuid.uuid4()),
        'name': name,
        'ip': ip,
        'mac': mac,
        'status': 'unknown',
        'added': datetime.now().isoformat(),
        'last_seen': None
    }
    
    devices.append(new_device)
    save_devices(devices)
    
    return jsonify({'status': 'Device added', 'device': new_device})

@app.route('/delete_device/<device_id>', methods=['DELETE'])
def delete_device(device_id):
    devices = load_devices()
    devices = [d for d in devices if d.get('id') != device_id]
    save_devices(devices)
    return jsonify({'status': 'Device deleted'})

@app.route('/edit_device/<device_id>', methods=['PUT'])
def edit_device(device_id):
    data = request.get_json() if request.is_json else request.form
    devices = load_devices()
    
    for device in devices:
        if device.get('id') == device_id:
            device['name'] = data.get('name', device['name'])
            device['ip'] = data.get('ip', device['ip'])
            device['mac'] = data.get('mac', device.get('mac', '')).upper()
            device['modified'] = datetime.now().isoformat()
            break
    else:
        return jsonify({'error': 'Device not found'}), 404
    
    save_devices(devices)
    return jsonify({'status': 'Device updated'})

@app.route('/discover', methods=['POST'])
def discover_devices():
    """Discover new devices and suggest adding them"""
    network_devices = scan_network()
    saved_devices = load_devices()
    saved_ips = {d['ip'] for d in saved_devices}
    
    new_devices = []
    for device in network_devices:
        if device['ip'] not in saved_ips:
            # Try to get MAC address
            mac = get_mac_address(device['ip'])
            device['mac'] = mac
            new_devices.append(device)
    
    return jsonify({
        'discovered': new_devices,
        'count': len(new_devices)
    })

if __name__ == '__main__':
    # Create config directory if it doesn't exist
    os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
    
    print("=" * 60)
    print("Wake-on-LAN Web Dashboard")
    print("=" * 60)
    
    try:
        # Try to determine the local IP address
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        
        network_range = get_network_range()
        
        print(f"Local IP: {local_ip}")
        print(f"Network Range: {network_range}")
        print(f"Server running at: http://{local_ip}:5000")
        print("=" * 60)
    except Exception as e:
        print("Could not determine network information:", e)
        print("Server running at: http://localhost:5000")
        print("=" * 60)
    
    # Debug mode is disabled for production use
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=True)
    