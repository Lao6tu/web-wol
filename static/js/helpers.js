// Helper functions for Pico CSS Wake-on-LAN Dashboard

// Theme management
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.setupToggleButton();
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
        this.updateToggleIcon();
    }

    setupToggleButton() {
        const toggleButton = document.getElementById('themeToggle');
        if (toggleButton) {
            toggleButton.addEventListener('click', () => {
                this.toggle();
            });
        }
    }

    updateToggleIcon() {
        const icon = document.getElementById('themeIcon');
        if (icon) {
            icon.textContent = this.currentTheme === 'light' ? '🌙' : '☀️';
        }
    }

    toggle() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
    }
}

// Toast notification system
class ToastManager {
    constructor() {
        this.container = document.getElementById('toastContainer');
        this.toast = document.getElementById('toastNotification');
        this.message = document.getElementById('toastMessage');
        this.closeButton = document.getElementById('closeToast');
        this.init();
    }

    init() {
        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => {
                this.hide();
            });
        }
    }

    show(message, type = 'info', duration = 5000) {
        if (!this.toast || !this.message) return;

        this.message.textContent = message;
        this.toast.style.display = 'block';
        this.toast.setAttribute('data-type', type);

        // Auto-hide after duration
        if (duration > 0) {
            setTimeout(() => {
                this.hide();
            }, duration);
        }
    }

    hide() {
        if (this.toast) {
            this.toast.style.display = 'none';
        }
    }

    success(message, duration = 5000) {
        this.show(message, 'success', duration);
    }

    error(message, duration = 8000) {
        this.show(message, 'error', duration);
    }

    info(message, duration = 5000) {
        this.show(message, 'info', duration);
    }

    warning(message, duration = 6000) {
        this.show(message, 'warning', duration);
    }
}

// Utility functions
const Utils = {
    // Format timestamps
    formatTimestamp(timestamp) {
        if (!timestamp) return 'Never';
        const date = new Date(timestamp);
        return date.toLocaleString();
    },

    // Validate IP address
    isValidIP(ip) {
        const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
        if (!ipRegex.test(ip)) return false;
        
        const parts = ip.split('.');
        return parts.every(part => {
            const num = parseInt(part, 10);
            return num >= 0 && num <= 255;
        });
    },

    // Validate MAC address
    isValidMAC(mac) {
        const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
        return macRegex.test(mac);
    },

    // Sanitize HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Format device status for display
    formatStatus(status) {
        const statusMap = {
            'online': { text: 'Online', class: 'status-online' },
            'offline': { text: 'Offline', class: 'status-offline' },
            'unknown': { text: 'Unknown', class: 'status-unknown' }
        };
        return statusMap[status] || statusMap.unknown;
    },

    // Show loading state on element
    setLoading(element, isLoading) {
        if (isLoading) {
            element.setAttribute('aria-busy', 'true');
            element.disabled = true;
        } else {
            element.removeAttribute('aria-busy');
            element.disabled = false;
        }
    },

    // Debounce function for search/input
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Copy text to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                return true;
            } catch (err) {
                return false;
            } finally {
                document.body.removeChild(textArea);
            }
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme manager
    window.themeManager = new ThemeManager();
    
    // Initialize toast manager
    window.toastManager = new ToastManager();
    
    // Make utilities globally available
    window.Utils = Utils;
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ThemeManager, ToastManager, Utils };
}