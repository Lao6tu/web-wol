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
    this.initMobileOptimizations();
  }
  initEventListeners() {
    // Main action buttons - safely add event listeners
    const scanBtn = document.getElementById("scanBtn");
    const refreshBtn = document.getElementById("refreshBtn");
    const discoverBtn = document.getElementById("discoverBtn");
    const submitAddDevice = document.getElementById("submitAddDevice");
    const submitEditDevice = document.getElementById("submitEditDevice");

    if (scanBtn) scanBtn.addEventListener("click", () => this.scanNetwork());
    if (refreshBtn)
      refreshBtn.addEventListener("click", () => this.loadDevices());
    if (discoverBtn)
      discoverBtn.addEventListener("click", () => this.discoverDevices());

    // Forms
    if (submitAddDevice)
      submitAddDevice.addEventListener("click", (e) => this.handleAddDevice(e));
    if (submitEditDevice)
      submitEditDevice.addEventListener("click", (e) =>
        this.handleEditDevice(e)
      );

    // No devices message button
    const noDevicesBtn = document.querySelector("#noDevicesMessage button");
    if (noDevicesBtn) {
      noDevicesBtn.addEventListener("click", () => {
        // Try to open modal if it exists
        if (window.addDeviceModal && window.addDeviceModal.open) {
          window.addDeviceModal.open();
        } else {
          console.warn("addDeviceModal not found");
        }
      });
    }
    // Enhanced button focus and animation management
    document.addEventListener("click", (e) => {
      if (e.target.tagName === "BUTTON") {
        // Remove any stuck states immediately
        e.target.style.transform = "";

        // Special handling for action buttons
        if (e.target.closest(".action-buttons")) {
          // Immediately blur action buttons to prevent stuck focus
          setTimeout(() => {
            e.target.blur();
            e.target.style.transform = "";
            e.target.classList.remove("button-pressed");
          }, 50);
        } else {
          // Regular button handling
          setTimeout(() => {
            e.target.blur();
            e.target.style.transform = "";
          }, 150);
        }
      }
    });

    // Handle button mousedown/mouseup for consistent animation
    document.addEventListener("mousedown", (e) => {
      if (e.target.tagName === "BUTTON") {
        e.target.classList.add("button-pressed");
      }
    });

    document.addEventListener("mouseup", (e) => {
      if (e.target.tagName === "BUTTON") {
        e.target.classList.remove("button-pressed");
      }
    });
    // Handle button focus/blur for keyboard navigation
    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        if (e.target.tagName === "BUTTON") {
          e.target.classList.add("button-pressed");
        }
      }
    });

    document.addEventListener("keyup", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        if (e.target.tagName === "BUTTON") {
          e.target.classList.remove("button-pressed");
        }
      }
    });

    // Mobile touch event handling
    document.addEventListener(
      "touchstart",
      (e) => {
        if (e.target.tagName === "BUTTON") {
          e.target.classList.add("button-pressed");
          // For mobile action buttons, immediately clear focus states
          if (e.target.closest(".action-buttons")) {
            e.target.style.transform = "";
            e.target.style.outline = "none";
            e.target.style.boxShadow = "none";
          }
        }
      },
      { passive: true }
    );

    document.addEventListener(
      "touchend",
      (e) => {
        if (e.target.tagName === "BUTTON") {
          // Immediate cleanup for mobile
          setTimeout(() => {
            e.target.classList.remove("button-pressed");
            e.target.style.transform = "";
            e.target.blur();

            // Extra aggressive cleanup for action buttons on mobile
            if (e.target.closest(".action-buttons")) {
              e.target.style.outline = "none";
              e.target.style.boxShadow = "none";
              e.target.style.border = "";
              // Force a reflow to ensure styles are applied
              e.target.offsetHeight;
            }
          }, 10); // Very short delay for mobile
        }
      },
      { passive: true }
    );

    document.addEventListener(
      "touchcancel",
      (e) => {
        if (e.target.tagName === "BUTTON") {
          e.target.classList.remove("button-pressed");
          e.target.style.transform = "";
          e.target.blur();
          if (e.target.closest(".action-buttons")) {
            e.target.style.outline = "none";
            e.target.style.boxShadow = "none";
          }
        }
      },
      { passive: true }
    );
  }
  async loadDevices() {
    try {
      console.log("Loading devices from /api/devices...");
      const response = await fetch("/api/devices");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Response data:", data);
      console.log("Data type:", typeof data);
      console.log("Is array:", Array.isArray(data));

      // Handle both response formats
      if (Array.isArray(data)) {
        // Direct array response from backend
        this.devices = data;
        this.lastScanTime = null;
      } else if (data.success) {
        // Object response with success field
        this.devices = data.devices || [];
        this.lastScanTime = data.last_scan;
      } else {
        // Error response
        throw new Error(data.error || "Failed to load devices");
      }

      this.renderDevices();
      this.updateStatistics();
      this.updateLastScanInfo();
    } catch (error) {
      console.error("Error loading devices:", error);
      window.toastManager.error(`Error loading devices: ${error.message}`);
      // Set empty devices array on error
      this.devices = [];
      this.renderDevices();
      this.updateStatistics();
    }
  }

  renderDevices() {
    const devicesTable = document.getElementById("devicesTable");
    const noDevicesMessage = document.getElementById("noDevicesMessage");
    const tableContainer = document.getElementById("devicesTableContainer");

    if (!this.devices || this.devices.length === 0) {
      tableContainer.style.display = "none";
      noDevicesMessage.style.display = "block";
      return;
    }

    tableContainer.style.display = "table";
    noDevicesMessage.style.display = "none";

    devicesTable.innerHTML = this.devices
      .map((device) => {
        const statusInfo = Utils.formatStatus(device.status);
        const lastSeen = device.last_seen
          ? Utils.formatTimestamp(device.last_seen)
          : "Never";

        return `
                <tr>
                    <td data-label="Status"><span class="${statusInfo.class}">${statusInfo.text}</span></td>
                    <td data-label="Name">${Utils.escapeHtml(device.name)}</td>
                    <td data-label="IP Address">${device.ip}</td>
                    <td data-label="MAC Address">${device.mac || "N/A"}</td>
                    <td data-label="Last Seen">${lastSeen}</td>
                    <td>
                        <div class="action-buttons" role="group">${device.mac? `
                            <button class="outline secondary" onclick="dashboard.wakeDevice('${device.id}', '${Utils.escapeHtml(device.name)}')" title="Wake device">💡</button>`: ""}
                            <button class="outline secondary" onclick="dashboard.pingDevice('${device.ip}', '${Utils.escapeHtml(device.name)}')" title="Ping device">⚡</button>
                            <button class="outline secondary" onclick="dashboard.editDevice('${device.id}')" title="Edit device">✏️</button>
                            <button class="outline secondary" onclick="dashboard.deleteDevice('${device.id}', '${Utils.escapeHtml(device.name)}')" title="Delete device">❌</button>
                        </div>
                    </td>
                </tr>
            `;
      })
      .join("");
  }
  
  updateStatistics() {
    const stats = {
      online: 0,
      offline: 0,
      unknown: 0,
      total: this.devices.length,
    };

    this.devices.forEach((device) => {
      if (device.status === "online") {
        stats.online++;
      } else if (device.status === "offline") {
        stats.offline++;
      } else {
        stats.unknown++;
      }
    });

    // Safely update statistics elements if they exist
    const onlineCountEl = document.getElementById("onlineCount");
    const offlineCountEl = document.getElementById("offlineCount");
    const unknownCountEl = document.getElementById("unknownCount");
    const totalCountEl = document.getElementById("totalCount");

    if (onlineCountEl) onlineCountEl.textContent = stats.online;
    if (offlineCountEl) offlineCountEl.textContent = stats.offline;
    if (unknownCountEl) unknownCountEl.textContent = stats.unknown;
    if (totalCountEl) totalCountEl.textContent = stats.total;
  }

  updateLastScanInfo() {
    const lastScanInfo = document.getElementById("lastScanInfo");
    const lastScanTime = document.getElementById("lastScanTime");

    if (this.lastScanTime) {
      lastScanInfo.style.display = "block";
      lastScanTime.textContent = Utils.formatTimestamp(this.lastScanTime);
    } else {
      lastScanInfo.style.display = "none";
    }
  }
  async scanNetwork() {
    if (this.isScanning) return;

    this.isScanning = true;
    const scanBtn = document.getElementById("scanBtn");
    const loadingIndicator = document.getElementById("loadingIndicator");

    if (scanBtn && Utils.setLoading) {
      Utils.setLoading(scanBtn, true);
    }
    if (loadingIndicator) {
      loadingIndicator.style.display = "block";
    }

    try {
      const response = await fetch("/scan", { method: "POST" });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Scan response:", data);

      if (data.success) {
        if (window.toastManager) {
          window.toastManager.success(
            `Scan completed! Found ${data.devices_found || 0} devices`
          );
        }
        this.loadDevices();
      } else {
        if (window.toastManager) {
          window.toastManager.error(data.error || "Scan failed");
        }
      }
    } catch (error) {
      console.error("Error scanning network:", error);
      if (window.toastManager) {
        window.toastManager.error(
          `Error during network scan: ${error.message}`
        );
      }
    } finally {
      this.isScanning = false;
      if (scanBtn && Utils.setLoading) {
        Utils.setLoading(scanBtn, false);
      }
      if (loadingIndicator) {
        loadingIndicator.style.display = "none";
      }
    }
  }
  async wakeDevice(deviceId, deviceName) {
    // Store reference to the clicked button for focus management
    const clickedButton = document.activeElement;
    if (clickedButton && clickedButton.tagName === "BUTTON") {
      // Clear any stuck states immediately
      clickedButton.blur();
      clickedButton.style.transform = "";
      clickedButton.classList.remove("button-pressed");
    }

    const device = this.devices.find((d) => d.id === deviceId);
    if (!device || !device.mac) {
      window.toastManager.warning(
        "Device MAC address is required for Wake-on-LAN"
      );
      return;
    }

    try {
      const response = await fetch("/wake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: deviceId }),
      });

      const data = await response.json();

      if (data.success) {
        window.toastManager.success(`Wake-on-LAN packet sent to ${deviceName}`);
      } else {
        window.toastManager.error(data.error || "Failed to wake device");
      }
    } catch (error) {
      console.error("Error waking device:", error);
      window.toastManager.error("Error sending wake packet");
    }
  }
  async pingDevice(ip, deviceName) {
    // Store reference to the clicked button for focus management
    const clickedButton = document.activeElement;
    if (clickedButton && clickedButton.tagName === "BUTTON") {
      // Clear any stuck states immediately
      clickedButton.blur();
      clickedButton.style.transform = "";
      clickedButton.classList.remove("button-pressed");
    }

    try {
      const response = await fetch(`/ping/${ip}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (data.success) {
        if (data.reachable) {
          window.toastManager.success(
            `${deviceName} is reachable (${data.response_time || "1ms"})`
          );
        } else {
          window.toastManager.warning(`${deviceName} is not reachable`);
        }
        this.loadDevices(); // Refresh devices to show updated status
      } else {
        window.toastManager.error(data.error || "Ping failed");
      }
    } catch (error) {
      console.error("Error pinging device:", error);
      window.toastManager.error("Error during ping");
    }
  }
  async deleteDevice(deviceId, deviceName) {
    // Store reference to the clicked button for focus management
    const clickedButton = document.activeElement;
    if (clickedButton && clickedButton.tagName === "BUTTON") {
      // Clear any stuck states immediately
      clickedButton.blur();
      clickedButton.style.transform = "";
      clickedButton.classList.remove("button-pressed");
    }

    if (!confirm(`Are you sure you want to delete "${deviceName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/delete_device/${deviceId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        window.toastManager.success(`${deviceName} deleted successfully`);
        this.loadDevices();
      } else {
        window.toastManager.error(data.error || "Failed to delete device");
      }
    } catch (error) {
      console.error("Error deleting device:", error);
      window.toastManager.error("Error deleting device");
    }
  }
  editDevice(deviceId) {
    const device = this.devices.find((d) => d.id === deviceId);
    if (!device) return;

    // Store reference to the clicked button for focus management
    const clickedButton = document.activeElement;
    if (clickedButton && clickedButton.tagName === "BUTTON") {
      // Clear any stuck states immediately
      clickedButton.blur();
      clickedButton.style.transform = "";
      clickedButton.classList.remove("button-pressed");
    }

    document.getElementById("editDeviceId").value = device.id;
    document.getElementById("editDeviceName").value = device.name;
    document.getElementById("editDeviceIP").value = device.ip;
    document.getElementById("editDeviceMAC").value = device.mac || "";

    window.editDeviceModal.open();
  }

  async handleAddDevice(e) {
    e.preventDefault();

    const name = document.getElementById("deviceName").value.trim();
    const ip = document.getElementById("deviceIP").value.trim();
    const mac = document.getElementById("deviceMAC").value.trim();

    if (!name || !ip) {
      window.toastManager.warning("Name and IP address are required");
      return;
    }

    if (!Utils.isValidIP(ip)) {
      window.toastManager.error("Please enter a valid IP address");
      return;
    }

    if (mac && !Utils.isValidMAC(mac)) {
      window.toastManager.error("Please enter a valid MAC address");
      return;
    }

    try {
      const response = await fetch("/add_device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ip, mac }),
      });

      const data = await response.json();

      if (data.success) {
        window.toastManager.success("Device added successfully");
        document.getElementById("addDeviceForm").reset();
        window.addDeviceModal.close();
        this.loadDevices();
      } else {
        window.toastManager.error(data.error || "Failed to add device");
      }
    } catch (error) {
      console.error("Error adding device:", error);
      window.toastManager.error("Error adding device");
    }
  }

  async handleEditDevice(e) {
    e.preventDefault();

    const id = document.getElementById("editDeviceId").value;
    const name = document.getElementById("editDeviceName").value.trim();
    const ip = document.getElementById("editDeviceIP").value.trim();
    const mac = document.getElementById("editDeviceMAC").value.trim();

    if (!name || !ip) {
      window.toastManager.warning("Name and IP address are required");
      return;
    }

    if (!Utils.isValidIP(ip)) {
      window.toastManager.error("Please enter a valid IP address");
      return;
    }

    if (mac && !Utils.isValidMAC(mac)) {
      window.toastManager.error("Please enter a valid MAC address");
      return;
    }
    try {
      const response = await fetch(`/edit_device/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ip, mac }),
      });

      const data = await response.json();

      if (data.success) {
        window.toastManager.success("Device updated successfully");
        window.editDeviceModal.close();
        this.loadDevices();
      } else {
        window.toastManager.error(data.error || "Failed to update device");
      }
    } catch (error) {
      console.error("Error updating device:", error);
      window.toastManager.error("Error updating device");
    }
  }

  async discoverDevices() {
    const discoverBtn = document.getElementById("discoverBtn");
    Utils.setLoading(discoverBtn, true);
    try {
      const response = await fetch("/discover", { method: "POST" });
      const data = await response.json();

      if (data.success) {
        this.showDiscoveryResults(data.discovered);
      } else {
        window.toastManager.error(data.error || "Discovery failed");
      }
    } catch (error) {
      console.error("Error discovering devices:", error);
      window.toastManager.error("Error during device discovery");
    } finally {
      Utils.setLoading(discoverBtn, false);
    }
  }

  showDiscoveryResults(discoveredDevices) {
    const discoveryResults = document.getElementById("discoveryResults");

    if (!discoveredDevices || discoveredDevices.length === 0) {
      discoveryResults.innerHTML = "<p>No new devices discovered.</p>";
    } else {
      discoveryResults.innerHTML = `
                <p>Found ${discoveredDevices.length} new device(s):</p>
                ${discoveredDevices
                  .map((device) => `
                    <div class="discovery-device">
                        <div class="discovery-device-info">
                            <h6>${Utils.escapeHtml(device.name || "Unknown Device")}</h6>
                            <p><strong>IP:</strong> ${device.ip}</p>
                            <p><strong>MAC:</strong> ${device.mac || "N/A"}</p>
                        </div>
                        <button class="primary" onclick="dashboard.addDiscoveredDevice('${Utils.escapeHtml(device.name || "Unknown Device")}', '${device.ip}', '${device.mac || ""}')">
                            Add Device
                        </button>
                    </div>
                `)
                  .join("")}
            `;
    }

    window.discoveryModal.open();
  }

  async addDiscoveredDevice(name, ip, mac) {
    try {
      const response = await fetch("/add_device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ip, mac }),
      });

      const data = await response.json();

      if (data.success) {
        window.toastManager.success(`${name} added successfully`);
        window.discoveryModal.close();
        this.loadDevices();
      } else {
        window.toastManager.error(data.error || "Failed to add device");
      }
    } catch (error) {
      console.error("Error adding discovered device:", error);
      window.toastManager.error("Error adding device");
    }
  }
  initMobileOptimizations() {
    // Detect mobile browser
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth <= 1068;

    if (isMobile) {
      console.log("Mobile device detected, applying optimizations...");

      // Add mobile-specific class to body
      document.body.classList.add("mobile-device");

      // Ultra-aggressive tap state clearing function
      const clearButtonStates = (button) => {
        if (button && button.tagName === "BUTTON") {
          button.blur();
          button.style.transform = "";
          button.style.outline = "none";
          button.style.boxShadow = "none";
          button.style.webkitTapHighlightColor = "transparent";
          button.classList.remove("button-pressed");
          // Force DOM reflow to ensure state changes are applied
          button.offsetHeight;
          // Remove focus from any potentially stuck elements
          if (document.activeElement === button) {
            document.body.focus();
            document.body.blur();
          }
        }
      };

      // Mobile-specific touch event handling
      document.addEventListener(
        "touchstart",
        (e) => {
          if (
            e.target.tagName === "BUTTON" &&
            e.target.closest(".action-buttons")
          ) {
            // Clear any existing stuck states immediately on touch
            clearButtonStates(e.target);
          }
        },
        { passive: true }
      );

      document.addEventListener(
        "touchend",
        (e) => {
          if (
            e.target.tagName === "BUTTON" &&
            e.target.closest(".action-buttons")
          ) {
            // Ultra-fast clearing after touch ends
            setTimeout(() => clearButtonStates(e.target), 1);
          }
        },
        { passive: true }
      );

      document.addEventListener(
        "touchcancel",
        (e) => {
          if (
            e.target.tagName === "BUTTON" &&
            e.target.closest(".action-buttons")
          ) {
            clearButtonStates(e.target);
          }
        },
        { passive: true }
      );

      // Enhanced click handling for mobile
      document.addEventListener("click", (e) => {
        if (
          e.target.tagName === "BUTTON" &&
          e.target.closest(".action-buttons")
        ) {
          // Immediate state reset
          setTimeout(() => clearButtonStates(e.target), 1);
          // Additional clearing after a short delay
          setTimeout(() => clearButtonStates(e.target), 50);
        }
      });

      // Clear states on any body/document interaction
      document.addEventListener(
        "touchstart",
        (e) => {
          if (!e.target.closest("button")) {
            // Clear all action button states when tapping elsewhere
            document
              .querySelectorAll(".action-buttons button")
              .forEach(clearButtonStates);
          }
        },
        { passive: true }
      );

      // Prevent focus retention on viewport changes (orientation change, etc.)
      window.addEventListener("resize", () => {
        // Clear all button states on resize/orientation change
        document
          .querySelectorAll(".action-buttons button")
          .forEach(clearButtonStates);
        // Also blur any focused element
        if (
          document.activeElement &&
          document.activeElement.tagName === "BUTTON"
        ) {
          document.activeElement.blur();
        }
      });

      // Enhanced scroll-triggered focus clearing
      window.addEventListener(
        "scroll",
        () => {
          const activeElement = document.activeElement;
          if (
            activeElement &&
            activeElement.tagName === "BUTTON" &&
            activeElement.closest(".action-buttons")
          ) {
            clearButtonStates(activeElement);
          }
        },
        { passive: true }
      ); // Periodic cleanup to catch any missed stuck states
      setInterval(() => {
        document
          .querySelectorAll(".action-buttons button")
          .forEach((button) => {
            if (button.matches(":focus") || button.matches(":active")) {
              clearButtonStates(button);
            }
          });
      }, 500);

      // Additional ultra-aggressive mobile clearing for webkit browsers
      if (/webkit|blink/i.test(navigator.userAgent)) {
        console.log(
          "WebKit/Blink browser detected, applying additional mobile tap clearing..."
        );

        // Force immediate clearing on any tap interaction
        document.addEventListener(
          "touchstart",
          (e) => {
            // Force immediate removal of tap highlights
            setTimeout(() => {
              if (
                e.target.tagName === "BUTTON" &&
                e.target.closest(".action-buttons")
              ) {
                e.target.style.webkitTapHighlightColor = "transparent";
                e.target.style.backgroundColor = "";
                e.target.style.transform = "";
                e.target.blur();
              }
            }, 0);
          },
          { passive: true }
        );

        // Global mobile state clearing every time user interacts with screen
        document.addEventListener(
          "touchend",
          () => {
            setTimeout(() => {
              document
                .querySelectorAll(".action-buttons button")
                .forEach(clearButtonStates);
            }, 10);
          },
          { passive: true }
        );
      }
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
document.addEventListener("DOMContentLoaded", function () {
  window.dashboard = new WOLDashboard();
});

// Handle page unload
window.addEventListener("beforeunload", function () {
  if (window.dashboard) {
    window.dashboard.stopAutoRefresh();
  }
});
