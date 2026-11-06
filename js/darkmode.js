/**
 * Dark Mode Manager
 * Handles theme switching between light and dark modes
 */

class DarkModeManager {
    constructor() {
        this.isDark = false;
        this.storageKey = 'saksham-theme';
        this.init();
    }

    /**
     * Initialize dark mode
     */
    init() {
        // Check saved preference
        const saved = localStorage.getItem(this.storageKey);
        
        if (saved) {
            this.isDark = saved === 'dark';
        } else {
            // Check system preference
            this.isDark = window.matchMedia && 
                          window.matchMedia('(prefers-color-scheme: dark)').matches;
        }

        // Apply theme
        this.applyTheme();

        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)')
                .addEventListener('change', e => {
                    if (!localStorage.getItem(this.storageKey)) {
                        this.isDark = e.matches;
                        this.applyTheme();
                    }
                });
        }
    }

    /**
     * Toggle between light and dark mode
     */
    toggle() {
        this.isDark = !this.isDark;
        this.applyTheme();
        localStorage.setItem(this.storageKey, this.isDark ? 'dark' : 'light');
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('themeChanged', { 
            detail: { theme: this.isDark ? 'dark' : 'light' }
        }));
    }

    /**
     * Apply theme to document
     */
    applyTheme() {
        if (this.isDark) {
            document.documentElement.classList.add('dark-mode');
            document.body.classList.add('dark-mode');
        } else {
            document.documentElement.classList.remove('dark-mode');
            document.body.classList.remove('dark-mode');
        }

        // Update toggle buttons if they exist
        this.updateToggleButton();
    }

    /**
     * Update toggle button appearance
     */
    updateToggleButton() {
        // Update navbar toggle button
        const toggleBtn = document.getElementById('darkModeToggle');
        if (toggleBtn) {
            toggleBtn.innerHTML = this.isDark ? '☀️ Light' : '🌙 Dark';
            toggleBtn.setAttribute('aria-label', 
                this.isDark ? 'Switch to light mode' : 'Switch to dark mode');
        }
        
        // Update floating toggle button
        const floatingToggle = document.getElementById('floatingDarkModeToggle');
        if (floatingToggle) {
            floatingToggle.innerHTML = this.isDark ? '☀️' : '🌙';
            floatingToggle.setAttribute('aria-label', 
                this.isDark ? 'Switch to light mode' : 'Switch to dark mode');
            floatingToggle.classList.toggle('light-mode', !this.isDark);
        }
    }

    /**
     * Get current theme
     */
    getCurrentTheme() {
        return this.isDark ? 'dark' : 'light';
    }

    /**
     * Set specific theme
     */
    setTheme(theme) {
        this.isDark = theme === 'dark';
        this.applyTheme();
        localStorage.setItem(this.storageKey, theme);
    }
    
    /**
     * Setup floating toggle button
     */
    setupFloatingToggle() {
        const floatingToggle = document.getElementById('floatingDarkModeToggle');
        if (floatingToggle) {
            floatingToggle.addEventListener('click', () => this.toggle());
            this.updateToggleButton();
        }
    }
}

// Create global instance
const darkModeManager = new DarkModeManager();

// Setup floating toggle when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    darkModeManager.setupFloatingToggle();
});

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DarkModeManager, darkModeManager };
} else {
    window.DarkModeManager = DarkModeManager;
    window.darkModeManager = darkModeManager;
}
