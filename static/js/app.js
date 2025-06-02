// Wake-on-LAN Dashboard JavaScript - Pico CSS Version

class WOLDashboard {
    constructor() {
        this.devices = [];
        this.lastScanTime = null;
        this.isScanning = false;
        this.refreshInterval = null;
        
        this.init();
    }

    init() {
        this.initEventListeners();
        this.loadDevices();
        this.startAutoRefresh();
    }

    initEventListeners() {
        // Main action buttons
        document.getElementById('scanBtn').addEventListener('click', () => this.scanNetwork());
        document.getElementById('refreshBtn').addEventListener('click', () => this.loadDevices());
        document.getElementById('discoverBtn').addEventListener('click', () => this.discoverDevices());
        
        // Forms
        document.getElementById('submitAddDevice').addEventListener('click', (e) => this.handleAddDevice(e));
        document.getElementById('submitEditDevice').addEventListener('click', (e) => this.handleEditDevice(e));
        
        // No devices message button
        const noDevicesBtn = document.querySelector('#noDevicesMessage button');
        if (noDevicesBtn) {
            noDevicesBtn.addEventListener('click', () => {
                window.addDeviceModal.open();
            });
        }
    }

    async loadDevices() {
        try {
            const response = await fetch('/api/devices');
            const data = await response.json();
            
            if (data.success) {
                this.devices = data.devices;
                this.lastScanTime = data.last_scan;
                this.renderDevices();
                this.updateStatistics();
                this.updateLastScanInfo();
            } else {
                window.toastManager.error(data.error || 'Failed to load devices');
            }
        } catch (error) {
            console.error('Error loading devices:', error);
            window.toastManager.error('Error connecting to server');
        }
    }

    renderDevices() {
        const devicesTable = document.getElementById('devicesTable');
        const noDevicesMessage = document.getElementById('noDevicesMessage');
        const tableContainer = document.getElementById('devicesTableContainer');

        if (!this.devices || this.devices.length === 0) {
            tableContainer.style.display = 'none';
            noDevicesMessage.style.display = 'block';
            return;
        }

        tableContainer.style.display = 'table';
        noDevicesMessage.style.display = 'none';

        devicesTable.innerHTML = this.devices.map(device => {
            const statusInfo = Utils.formatStatus(device.status);
            const lastSeen = device.last_seen ? Utils.formatTimestamp(device.last_seen) : 'Never';
            
            return `
                <tr>
                    <td><span class="${statusInfo.class}">${statusInfo.text}</span></td>
                    <td>${Utils.escapeHtml(device.name)}</td>
                    <td>${device.ip}</td>
                    <td>${device.mac || 'N/A'}</td>
                    <td>${lastSeen}</td>
                    <td>
                        <div class="action-buttons">
                            ${device.mac ? `<button class="outline primary" onclick="dashboard.wakeDevice('${device.id}', '${Utils.escapeHtml(device.name)}')" title="Wake device">⚡ Wake</button>` : ''}
                            <button class="outline secondary" onclick="dashboard.pingDevice('${device.ip}', '${Utils.escapeHtml(device.name)}')" title="Ping device">📡 Ping</button>
                            <button class="outline" onclick="dashboard.editDevice('${device.id}')" title="Edit device">✏️ Edit</button>
                            <button class="outline contrast" onclick="dashboard.deleteDevice('${device.id}', '${Utils.escapeHtml(device.name)}')" title="Delete device">🗑️ Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateStatistics() {
        const stats = {
            online: 0,
            offline: 0,
            unknown: 0,
            total: this.devices.length
        };

        this.devices.forEach(device => {
            if (device.status === 'online') {
                stats.online++;
            } else if (device.status === 'offline') {
                stats.offline++;
            } else {
                stats.unknown++;
            }
        });

        document.getElementById('onlineCount').textContent = stats.online;
        document.getElementById('offlineCount').textContent = stats.offline;
        document.getElementById('unknownCount').textContent = stats.unknown;
        document.getElementById('totalCount').textContent = stats.total;
    }

    updateLastScanInfo() {
        const lastScanInfo = document.getElementById('lastScanInfo');
        const lastScanTime = document.getElementById('lastScanTime');
        
        if (this.lastScanTime) {
            lastScanInfo.style.display = 'block';
            lastScanTime.textContent = Utils.formatTimestamp(this.lastScanTime);
        } else {
            lastScanInfo.style.display = 'none';
        }
    }

    async scanNetwork() {
        if (this.isScanning) return;

        this.isScanning = true;
        const scanBtn = document.getElementById('scanBtn');
        const loadingIndicator = document.getElementById('loadingIndicator');
        
        Utils.setLoading(scanBtn, true);
        loadingIndicator.style.display = 'block';

        try {
            const response = await fetch('/scan', { method: 'POST' });
            const data = await response.json();
            
            if (data.success) {
                window.toastManager.success(`Scan completed! Found ${data.devices_found} devices`);
                this.loadDevices();
            } else {
                window.toastManager.error(data.error || 'Scan failed');
            }
        } catch (error) {
            console.error('Error scanning network:', error);
            window.toastManager.error('Error during network scan');
        } finally {
            this.isScanning = false;
            Utils.setLoading(scanBtn, false);
            loadingIndicator.style.display = 'none';
        }
    }

    async wakeDevice(deviceId, deviceName) {
        const device = this.devices.find(d => d.id === deviceId);
        if (!device || !device.mac) {
            window.toastManager.warning('Device MAC address is required for Wake-on-LAN');
            return;
        }

        try {
            const response = await fetch('/wake', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ device_id: deviceId })
            });
            
            const data = await response.json();
            
            if (data.success) {
                window.toastManager.success(`Wake-on-LAN packet sent to ${deviceName}`);
            } else {
                window.toastManager.error(data.error || 'Failed to wake device');
            }
        } catch (error) {
            console.error('Error waking device:', error);
            window.toastManager.error('Error sending wake packet');
        }
    }

    async pingDevice(ip, deviceName) {
        try {
            const response = await fetch('/ping', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip: ip })
            });
            
            const data = await response.json();
            
            if (data.success) {
                if (data.reachable) {
                    window.toastManager.success(`${deviceName} is reachable (${data.response_time}ms)`);
                } else {
                    window.toastManager.warning(`${deviceName} is not reachable`);
                }
            } else {
                window.toastManager.error(data.error || 'Ping failed');
            }
        } catch (error) {
            console.error('Error pinging device:', error);
            window.toastManager.error('Error during ping');
        }
    }

    async deleteDevice(deviceId, deviceName) {
        if (!confirm(`Are you sure you want to delete "${deviceName}"?`)) {
            return;
        }

        try {
            const response = await fetch(`/delete_device/${deviceId}`, { method: 'DELETE' });
            const data = await response.json();
            
            if (data.success) {
                window.toastManager.success(`${deviceName} deleted successfully`);
                this.loadDevices();
            } else {
                window.toastManager.error(data.error || 'Failed to delete device');
            }
        } catch (error) {
            console.error('Error deleting device:', error);
            window.toastManager.error('Error deleting device');
        }
    }

    editDevice(deviceId) {
        const device = this.devices.find(d => d.id === deviceId);
        if (!device) return;

        document.getElementById('editDeviceId').value = device.id;
        document.getElementById('editDeviceName').value = device.name;
        document.getElementById('editDeviceIP').value = device.ip;
        document.getElementById('editDeviceMAC').value = device.mac || '';

        window.editDeviceModal.open();
    }

    async handleAddDevice(e) {
        e.preventDefault();
        
        const name = document.getElementById('deviceName').value.trim();
        const ip = document.getElementById('deviceIP').value.trim();
        const mac = document.getElementById('deviceMAC').value.trim();

        if (!name || !ip) {
            window.toastManager.warning('Name and IP address are required');
            return;
        }

        if (!Utils.isValidIP(ip)) {
            window.toastManager.error('Please enter a valid IP address');
            return;
        }

        if (mac && !Utils.isValidMAC(mac)) {
            window.toastManager.error('Please enter a valid MAC address');
            return;
        }

        try {
            const response = await fetch('/add_device', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, ip, mac })
            });
            
            const data = await response.json();
            
            if (data.success) {
                window.toastManager.success('Device added successfully');
                document.getElementById('addDeviceForm').reset();
                window.addDeviceModal.close();
                this.loadDevices();
            } else {
                window.toastManager.error(data.error || 'Failed to add device');
            }
        } catch (error) {
            console.error('Error adding device:', error);
            window.toastManager.error('Error adding device');
        }
    }

    async handleEditDevice(e) {
        e.preventDefault();
        
        const id = document.getElementById('editDeviceId').value;
        const name = document.getElementById('editDeviceName').value.trim();
        const ip = document.getElementById('editDeviceIP').value.trim();
        const mac = document.getElementById('editDeviceMAC').value.trim();

        if (!name || !ip) {
            window.toastManager.warning('Name and IP address are required');
            return;
        }

        if (!Utils.isValidIP(ip)) {
            window.toastManager.error('Please enter a valid IP address');
            return;
        }

        if (mac && !Utils.isValidMAC(mac)) {
            window.toastManager.error('Please enter a valid MAC address');
            return;
        }

        try {
            const response = await fetch(`/update_device/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, ip, mac })
            });
            
            const data = await response.json();
            
            if (data.success) {
                window.toastManager.success('Device updated successfully');
                window.editDeviceModal.close();
                this.loadDevices();
            } else {
                window.toastManager.error(data.error || 'Failed to update device');
            }
        } catch (error) {
            console.error('Error updating device:', error);
            window.toastManager.error('Error updating device');
        }
    }

    async discoverDevices() {
        const discoverBtn = document.getElementById('discoverBtn');
        Utils.setLoading(discoverBtn, true);

        try {
            const response = await fetch('/discover');
            const data = await response.json();
            
            if (data.success) {
                this.showDiscoveryResults(data.discovered);
            } else {
                window.toastManager.error(data.error || 'Discovery failed');
            }
        } catch (error) {
            console.error('Error discovering devices:', error);
            window.toastManager.error('Error during device discovery');
        } finally {
            Utils.setLoading(discoverBtn, false);
        }
    }

    showDiscoveryResults(discoveredDevices) {
        const discoveryResults = document.getElementById('discoveryResults');
        
        if (!discoveredDevices || discoveredDevices.length === 0) {
            discoveryResults.innerHTML = '<p>No new devices discovered.</p>';
        } else {
            discoveryResults.innerHTML = `
                <p>Found ${discoveredDevices.length} new device(s):</p>
                ${discoveredDevices.map(device => `
                    <div class="discovery-device">
                        <h4>${Utils.escapeHtml(device.name || 'Unknown Device')}</h4>
                        <p><strong>IP:</strong> ${device.ip}</p>
                        <p><strong>MAC:</strong> ${device.mac || 'N/A'}</p>
                        <button class="primary" onclick="dashboard.addDiscoveredDevice('${Utils.escapeHtml(device.name || 'Unknown Device')}', '${device.ip}', '${device.mac || ''}')">
                            Add Device
                        </button>
                    </div>
                `).join('')}
            `;
        }
        
        window.discoveryModal.open();
    }

    async addDiscoveredDevice(name, ip, mac) {
        try {
            const response = await fetch('/add_device', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, ip, mac })
            });
            
            const data = await response.json();
            
            if (data.success) {
                window.toastManager.success(`${name} added successfully`);
                window.discoveryModal.close();
                this.loadDevices();
            } else {
                window.toastManager.error(data.error || 'Failed to add device');
            }
        } catch (error) {
            console.error('Error adding discovered device:', error);
            window.toastManager.error('Error adding device');
        }
    }

    startAutoRefresh() {
        // Refresh devices every 30 seconds
        this.refreshInterval = setInterval(() => {
            if (!this.isScanning) {
                this.loadDevices();
            }
        }, 30000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.dashboard = new WOLDashboard();
});

// Handle page unload
window.addEventListener('beforeunload', function() {
    if (window.dashboard) {
        window.dashboard.stopAutoRefresh();
    }
});
