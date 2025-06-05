// Modal functionality for Pico CSS
class PicoModal {
  constructor(dialogId) {
    this.dialog = document.getElementById(dialogId);
    this.isOpen = false;
    this.lastFocusedElement = null;
    this.init();
  }

  init() {
    // Add close button functionality
    const closeButtons = this.dialog.querySelectorAll(
      'button[aria-label="Close"], button[rel="prev"]'
    );
    closeButtons.forEach((button) => {
      button.addEventListener("click", () => this.close());
    });

    // Close on ESC key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen) {
        this.close();
      }
    });

    // Close on backdrop click
    this.dialog.addEventListener("click", (e) => {
      if (e.target === this.dialog) {
        this.close();
      }
    });
  }

  open() {
    // Store the currently focused element
    this.lastFocusedElement = document.activeElement;

    this.dialog.showModal();
    this.isOpen = true;
    document.body.style.overflow = "hidden";
  }

  close() {
    this.dialog.close();
    this.isOpen = false;
    document.body.style.overflow = "";

    // Handle focus management after modal closes
    this.handleFocusAfterClose();
  }

  handleFocusAfterClose() {
    // Small delay to ensure modal close animation completes
    setTimeout(() => {
      // If we stored a previously focused element, blur it to prevent stuck focus
      if (this.lastFocusedElement) {
        // Clear any stuck focus states
        this.lastFocusedElement.blur();

        // Remove any stuck transform states
        this.lastFocusedElement.style.transform = "";

        // Clear the button-pressed class if it exists
        this.lastFocusedElement.classList.remove("button-pressed");

        // Reset the stored element
        this.lastFocusedElement = null;
      }

      // Also clear focus from any currently focused element to prevent stuck states
      if (
        document.activeElement &&
        document.activeElement.tagName === "BUTTON"
      ) {
        document.activeElement.blur();
        document.activeElement.style.transform = "";
        document.activeElement.classList.remove("button-pressed");
      }
    }, 100);
  }
}

// Initialize modals when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Initialize all modals
  window.addDeviceModal = new PicoModal("addDeviceModal");
  window.editDeviceModal = new PicoModal("editDeviceModal");
  window.discoveryModal = new PicoModal("discoveryModal");

  // Add event listeners for specific modal actions
  initModalEventListeners();
});

function initModalEventListeners() {
  // Add Device Modal
  const addDeviceBtn = document.getElementById("addDeviceBtn");
  if (addDeviceBtn) {
    addDeviceBtn.addEventListener("click", () => {
      window.addDeviceModal.open();
    });
  }

  const cancelAddDevice = document.getElementById("cancelAddDevice");
  if (cancelAddDevice) {
    cancelAddDevice.addEventListener("click", () => {
      window.addDeviceModal.close();
    });
  }

  const closeAddModal = document.getElementById("closeAddModal");
  if (closeAddModal) {
    closeAddModal.addEventListener("click", () => {
      window.addDeviceModal.close();
    });
  }

  // Edit Device Modal
  const cancelEditDevice = document.getElementById("cancelEditDevice");
  if (cancelEditDevice) {
    cancelEditDevice.addEventListener("click", () => {
      window.editDeviceModal.close();
    });
  }

  const closeEditModal = document.getElementById("closeEditModal");
  if (closeEditModal) {
    closeEditModal.addEventListener("click", () => {
      window.editDeviceModal.close();
    });
  }

  // Discovery Modal
  const closeDiscoveryBtn = document.getElementById("closeDiscoveryBtn");
  if (closeDiscoveryBtn) {
    closeDiscoveryBtn.addEventListener("click", () => {
      window.discoveryModal.close();
    });
  }

  const closeDiscoveryModal = document.getElementById("closeDiscoveryModal");
  if (closeDiscoveryModal) {
    closeDiscoveryModal.addEventListener("click", () => {
      window.discoveryModal.close();
    });
  }
}
