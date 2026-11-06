/**
 * Loading States Utility
 * Manages loading indicators for buttons and async operations
 */

class LoadingManager {
    constructor() {
        this.loadingButtons = new Map();
        this.loadingOverlays = new Map();
    }

    /**
     * Set button to loading state
     */
    setButtonLoading(buttonId, loadingText = 'Loading...') {
        const button = document.getElementById(buttonId);
        if (!button) return;

        // Store original state
        if (!this.loadingButtons.has(buttonId)) {
            this.loadingButtons.set(buttonId, {
                originalText: button.textContent || button.innerHTML,
                originalDisabled: button.disabled
            });
        }

        // Set loading state
        button.disabled = true;
        button.classList.add('btn-loading');
        button.innerHTML = `
            <span class="spinner"></span>
            <span>${loadingText}</span>
        `;
    }

    /**
     * Reset button from loading state
     */
    resetButton(buttonId) {
        const button = document.getElementById(buttonId);
        if (!button) return;

        const originalState = this.loadingButtons.get(buttonId);
        if (!originalState) return;

        // Restore original state
        button.disabled = originalState.originalDisabled;
        button.classList.remove('btn-loading');
        button.innerHTML = originalState.originalText;

        // Clean up
        this.loadingButtons.delete(buttonId);
    }

    /**
     * Show loading overlay on a container
     */
    showOverlay(containerId, message = 'Loading...') {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Remove existing overlay if any
        this.hideOverlay(containerId);

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.id = `${containerId}-loading-overlay`;
        overlay.innerHTML = `
            <div class="loading-spinner-container">
                <div class="loading-spinner"></div>
                <p class="loading-message">${message}</p>
            </div>
        `;

        // Add to container
        container.style.position = 'relative';
        container.appendChild(overlay);

        this.loadingOverlays.set(containerId, overlay);
    }

    /**
     * Hide loading overlay
     */
    hideOverlay(containerId) {
        const overlay = this.loadingOverlays.get(containerId);
        if (overlay && overlay.parentNode) {
            overlay.remove();
            this.loadingOverlays.delete(containerId);
        }

        // Try to find and remove by ID as fallback
        const overlayElement = document.getElementById(`${containerId}-loading-overlay`);
        if (overlayElement) {
            overlayElement.remove();
        }
    }

    /**
     * Show inline loading indicator in an element
     */
    showInline(elementId, size = 'small') {
        const element = document.getElementById(elementId);
        if (!element) return;

        const spinner = document.createElement('span');
        spinner.className = `inline-spinner inline-spinner-${size}`;
        spinner.id = `${elementId}-inline-spinner`;
        
        element.appendChild(spinner);
    }

    /**
     * Hide inline loading indicator
     */
    hideInline(elementId) {
        const spinner = document.getElementById(`${elementId}-inline-spinner`);
        if (spinner) {
            spinner.remove();
        }
    }

    /**
     * Show global page loader
     */
    showPageLoader(message = 'Loading...') {
        // Remove existing loader
        this.hidePageLoader();

        const loader = document.createElement('div');
        loader.id = 'global-page-loader';
        loader.className = 'page-loader';
        loader.innerHTML = `
            <div class="page-loader-content">
                <div class="page-loader-spinner"></div>
                <p class="page-loader-message">${message}</p>
            </div>
        `;

        document.body.appendChild(loader);
        
        // Prevent scrolling
        document.body.style.overflow = 'hidden';
    }

    /**
     * Hide global page loader
     */
    hidePageLoader() {
        const loader = document.getElementById('global-page-loader');
        if (loader) {
            loader.remove();
            document.body.style.overflow = '';
        }
    }

    /**
     * Wrap async function with loading state
     */
    async withButtonLoading(buttonId, asyncFn, loadingText = 'Loading...') {
        this.setButtonLoading(buttonId, loadingText);
        try {
            const result = await asyncFn();
            return result;
        } finally {
            this.resetButton(buttonId);
        }
    }

    /**
     * Wrap async function with overlay loading
     */
    async withOverlay(containerId, asyncFn, message = 'Loading...') {
        this.showOverlay(containerId, message);
        try {
            const result = await asyncFn();
            return result;
        } finally {
            this.hideOverlay(containerId);
        }
    }
}

// Create global instance
const loadingManager = new LoadingManager();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LoadingManager, loadingManager };
} else {
    window.LoadingManager = LoadingManager;
    window.loadingManager = loadingManager;
}
