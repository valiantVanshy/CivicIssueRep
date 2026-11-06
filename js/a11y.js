/**
 * Accessibility (A11y) Manager
 * WCAG 2.1 AA compliance features for SAKSHAM
 */

class A11yManager {
    constructor() {
        this.focusTrapStack = [];
        this.announcer = null;
        this.highContrastMode = false;
        this.reducedMotion = false;
        this.fontSize = 100;
        this.init();
    }

    /**
     * Initialize accessibility features
     */
    init() {
        console.log('[A11y] Initializing...');
        this.createLiveRegion();
        this.setupKeyboardNavigation();
        this.setupFocusIndicators();
        this.detectPreferences();
        this.createA11yPanel();
        this.enhanceFormLabels();
        this.setupLandmarks();
        console.log('[A11y] Initialization complete');
    }

    // Skip-links removed by user request. If re-introducing, prefer an element
    // that is visually hidden and revealed only on :focus for accessibility.

    /**
     * Create ARIA live region for announcements
     */
    createLiveRegion() {
        this.announcer = document.createElement('div');
        this.announcer.id = 'a11y-announcer';
        this.announcer.className = 'sr-only';
        this.announcer.setAttribute('aria-live', 'polite');
        this.announcer.setAttribute('aria-atomic', 'true');
        document.body.appendChild(this.announcer);

        // Create a separate assertive announcer for urgent messages
        const assertiveAnnouncer = document.createElement('div');
        assertiveAnnouncer.id = 'a11y-announcer-assertive';
        assertiveAnnouncer.className = 'sr-only';
        assertiveAnnouncer.setAttribute('aria-live', 'assertive');
        assertiveAnnouncer.setAttribute('aria-atomic', 'true');
        document.body.appendChild(assertiveAnnouncer);
    }

    /**
     * Announce message to screen readers
     */
    announce(message, priority = 'polite') {
        const announcer = priority === 'assertive' 
            ? document.getElementById('a11y-announcer-assertive')
            : this.announcer;

        if (announcer) {
            announcer.textContent = '';
            // Force announcement by resetting
            setTimeout(() => {
                announcer.textContent = message;
            }, 100);
        }
    }

    /**
     * Setup keyboard navigation
     */
    setupKeyboardNavigation() {
        // Global keyboard shortcuts - use capture phase for priority
        document.addEventListener('keydown', (e) => {
            // Check if Alt key is pressed for navigation shortcuts
            if (e.altKey) {
                // Alt + 1: Go to home
                if (e.key === '1' || e.code === 'Digit1' || e.keyCode === 49) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.navigateTo('landingPage');
                    this.announce('Navigated to home');
                    return false;
                }
                
                // Alt + 2: Go to reports
                if (e.key === '2' || e.code === 'Digit2' || e.keyCode === 50) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.navigateTo('reportHistoryPage');
                    this.announce('Navigated to reports');
                    return false;
                }
                
                // Alt + 3: New report
                if (e.key === '3' || e.code === 'Digit3' || e.keyCode === 51) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.navigateTo('reportFormPage');
                    this.announce('Navigated to new report form');
                    return false;
                }
                
                // Alt + 0: Accessibility settings
                if (e.key === '0' || e.code === 'Digit0' || e.keyCode === 48) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleA11yPanel();
                    return false;
                }
            }

            // Escape: Close any open modal/panel
            if (e.key === 'Escape') {
                this.closeActiveOverlay();
            }
        }, true); // Use capture phase

        // Arrow key navigation in lists
        document.addEventListener('keydown', (e) => {
            const target = e.target;
            
            if (target.matches('[role="listbox"] [role="option"], [role="menu"] [role="menuitem"]')) {
                this.handleListNavigation(e, target);
            }
        });
        
        console.log('A11y: Keyboard shortcuts registered (Alt+0,1,2,3)');
    }

    /**
     * Handle list keyboard navigation
     */
    handleListNavigation(e, currentItem) {
        const list = currentItem.closest('[role="listbox"], [role="menu"]');
        const items = Array.from(list.querySelectorAll('[role="option"], [role="menuitem"]'));
        const currentIndex = items.indexOf(currentItem);

        let nextIndex = currentIndex;

        switch (e.key) {
            case 'ArrowDown':
            case 'ArrowRight':
                e.preventDefault();
                nextIndex = Math.min(currentIndex + 1, items.length - 1);
                break;
            case 'ArrowUp':
            case 'ArrowLeft':
                e.preventDefault();
                nextIndex = Math.max(currentIndex - 1, 0);
                break;
            case 'Home':
                e.preventDefault();
                nextIndex = 0;
                break;
            case 'End':
                e.preventDefault();
                nextIndex = items.length - 1;
                break;
        }

        if (nextIndex !== currentIndex) {
            items[nextIndex].focus();
        }
    }

    /**
     * Navigate to a page
     */
    navigateTo(pageId) {
        console.log('A11y: Navigating to', pageId);
        if (window.app && typeof window.app.showPage === 'function') {
            // Check if user needs to be logged in for this page
            const protectedPages = ['reportFormPage', 'reportHistoryPage', 'adminDashboard'];
            if (protectedPages.includes(pageId) && !window.app.auth?.isAuthenticated()) {
                this.announce('Please log in first to access this page');
                window.app.showToast('Please log in to access this feature', 'warning');
                return;
            }
            window.app.showPage(pageId);
        } else {
            console.warn('A11y: window.app.showPage not available');
        }
    }

    /**
     * Close active overlay (modal, panel)
     */
    closeActiveOverlay() {
        // Close messaging panel
        const messagingPanel = document.getElementById('messagingPanel');
        if (messagingPanel && !messagingPanel.classList.contains('hidden')) {
            window.messagingManager?.closePanel();
            return;
        }

        // Close modals
        const modals = document.querySelectorAll('.modal:not(.hidden)');
        modals.forEach(modal => modal.classList.add('hidden'));

        // Release focus trap
        this.releaseFocusTrap();
    }

    /**
     * Setup focus indicators
     */
    setupFocusIndicators() {
        // Add focus-visible polyfill behavior
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });

        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });
    }

    /**
     * Detect user preferences
     */
    detectPreferences() {
        // Reduced motion
        if (window.matchMedia) {
            const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            this.reducedMotion = motionQuery.matches;
            
            if (this.reducedMotion) {
                document.documentElement.classList.add('reduce-motion');
            }

            motionQuery.addEventListener('change', (e) => {
                this.reducedMotion = e.matches;
                document.documentElement.classList.toggle('reduce-motion', e.matches);
            });

            // High contrast
            const contrastQuery = window.matchMedia('(prefers-contrast: more)');
            this.highContrastMode = contrastQuery.matches;
            
            if (this.highContrastMode) {
                document.documentElement.classList.add('high-contrast');
            }

            contrastQuery.addEventListener('change', (e) => {
                this.highContrastMode = e.matches;
                document.documentElement.classList.toggle('high-contrast', e.matches);
            });
        }

        // Load saved preferences
        const savedFontSize = localStorage.getItem('saksham-font-size');
        if (savedFontSize) {
            this.setFontSize(parseInt(savedFontSize));
        }

        const savedHighContrast = localStorage.getItem('saksham-high-contrast');
        if (savedHighContrast === 'true') {
            this.toggleHighContrast(true);
        }
        
        const savedReduceMotion = localStorage.getItem('saksham-reduce-motion');
        if (savedReduceMotion === 'true') {
            this.toggleReduceMotion(true);
        }
        
        // Enable enhanced focus by default
        const savedEnhancedFocus = localStorage.getItem('saksham-enhanced-focus');
        if (savedEnhancedFocus !== 'false') {
            document.documentElement.classList.add('enhanced-focus');
        }
        
        console.log('A11y: Preferences loaded');
    }

    /**
     * Create accessibility settings panel
     */
    createA11yPanel() {
        const panel = document.createElement('div');
        panel.id = 'a11yPanel';
        panel.className = 'a11y-panel hidden';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'Accessibility settings');
        panel.innerHTML = `
            <div class="a11y-header">
                <h3>♿ Accessibility Settings</h3>
                <button class="btn btn-icon" id="closeA11yPanel" aria-label="Close accessibility settings">&times;</button>
            </div>
            <div class="a11y-content">
                <div class="a11y-option">
                    <label for="fontSizeSlider">Text Size: <span id="fontSizeValue">100%</span></label>
                    <input type="range" id="fontSizeSlider" min="80" max="150" value="100" step="5"
                           aria-describedby="fontSizeDesc">
                    <small id="fontSizeDesc">Adjust the text size for better readability</small>
                </div>
                
                <div class="a11y-option">
                    <label class="toggle-label">
                        <input type="checkbox" id="highContrastToggle">
                        <span>High Contrast Mode</span>
                    </label>
                    <small>Increases contrast for better visibility</small>
                </div>
                
                <div class="a11y-option">
                    <label class="toggle-label">
                        <input type="checkbox" id="reduceMotionToggle" ${this.reducedMotion ? 'checked' : ''}>
                        <span>Reduce Motion</span>
                    </label>
                    <small>Minimizes animations and transitions</small>
                </div>
                
                <div class="a11y-option">
                    <label class="toggle-label">
                        <input type="checkbox" id="focusHighlightToggle" checked>
                        <span>Enhanced Focus Indicators</span>
                    </label>
                    <small>Makes keyboard focus more visible</small>
                </div>
                
                <div class="a11y-shortcuts">
                    <h4>Keyboard Shortcuts</h4>
                    <ul>
                        <li><kbd>Alt</kbd> + <kbd>1</kbd> - Go to Home</li>
                        <li><kbd>Alt</kbd> + <kbd>2</kbd> - Go to Reports</li>
                        <li><kbd>Alt</kbd> + <kbd>3</kbd> - New Report</li>
                        <li><kbd>Alt</kbd> + <kbd>0</kbd> - Accessibility Settings</li>
                        <li><kbd>Esc</kbd> - Close overlay/modal</li>
                        <li><kbd>Tab</kbd> - Navigate forward</li>
                        <li><kbd>Shift</kbd> + <kbd>Tab</kbd> - Navigate backward</li>
                    </ul>
                </div>
                
                <button class="btn btn-secondary" id="resetA11ySettings">Reset to Defaults</button>
            </div>
        `;
        document.body.appendChild(panel);

        // Create floating accessibility button
        const a11yBtn = document.createElement('button');
        a11yBtn.id = 'a11yBtn';
        a11yBtn.className = 'floating-a11y-btn';
        a11yBtn.setAttribute('aria-label', 'Open accessibility settings');
        a11yBtn.innerHTML = '♿';
        document.body.appendChild(a11yBtn);

        this.setupA11yPanelEvents();
    }

    /**
     * Setup accessibility panel events
     */
    setupA11yPanelEvents() {
        // Toggle panel
        document.getElementById('a11yBtn')?.addEventListener('click', () => this.toggleA11yPanel());
        document.getElementById('closeA11yPanel')?.addEventListener('click', () => this.closeA11yPanel());

        // Font size
        document.getElementById('fontSizeSlider')?.addEventListener('input', (e) => {
            this.setFontSize(parseInt(e.target.value));
        });

        // High contrast
        document.getElementById('highContrastToggle')?.addEventListener('change', (e) => {
            this.toggleHighContrast(e.target.checked);
        });

        // Reduce motion
        document.getElementById('reduceMotionToggle')?.addEventListener('change', (e) => {
            this.toggleReduceMotion(e.target.checked);
        });

        // Focus highlight
        document.getElementById('focusHighlightToggle')?.addEventListener('change', (e) => {
            document.documentElement.classList.toggle('enhanced-focus', e.target.checked);
            localStorage.setItem('saksham-enhanced-focus', e.target.checked.toString());
            this.announce(e.target.checked ? 'Enhanced focus enabled' : 'Enhanced focus disabled');
        });

        // Reset
        document.getElementById('resetA11ySettings')?.addEventListener('click', () => {
            this.resetSettings();
        });

        // Keyboard
        document.getElementById('a11yPanel')?.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeA11yPanel();
            }
        });
    }

    /**
     * Toggle accessibility panel
     */
    toggleA11yPanel() {
        const panel = document.getElementById('a11yPanel');
        if (panel.classList.contains('hidden')) {
            this.openA11yPanel();
        } else {
            this.closeA11yPanel();
        }
    }

    /**
     * Open accessibility panel
     */
    openA11yPanel() {
        const panel = document.getElementById('a11yPanel');
        panel.classList.remove('hidden');
        this.trapFocus(panel);
        document.getElementById('closeA11yPanel')?.focus();
        this.announce('Accessibility settings opened');
    }

    /**
     * Close accessibility panel
     */
    closeA11yPanel() {
        const panel = document.getElementById('a11yPanel');
        panel.classList.add('hidden');
        this.releaseFocusTrap();
        document.getElementById('a11yBtn')?.focus();
        this.announce('Accessibility settings closed');
    }

    /**
     * Set font size
     */
    setFontSize(size) {
        this.fontSize = size;
        // Set CSS variable for font scale
        document.documentElement.style.setProperty('--font-scale', size / 100);
        // Also set root font-size for rem-based sizing
        document.documentElement.style.fontSize = `${size}%`;
        // Force all text elements to respect the scale
        document.body.style.fontSize = `calc(1rem * var(--font-scale, 1))`;
        
        localStorage.setItem('saksham-font-size', size.toString());
        
        const display = document.getElementById('fontSizeValue');
        if (display) display.textContent = `${size}%`;
        
        const slider = document.getElementById('fontSizeSlider');
        if (slider) slider.value = size;
        
        this.announce(`Text size set to ${size} percent`);
    }

    /**
     * Toggle high contrast mode
     */
    toggleHighContrast(enabled) {
        this.highContrastMode = enabled;
        document.documentElement.classList.toggle('high-contrast', enabled);
        localStorage.setItem('saksham-high-contrast', enabled.toString());
        
        const checkbox = document.getElementById('highContrastToggle');
        if (checkbox) checkbox.checked = enabled;
        
        this.announce(enabled ? 'High contrast mode enabled' : 'High contrast mode disabled');
    }

    /**
     * Toggle reduced motion
     */
    toggleReduceMotion(enabled) {
        this.reducedMotion = enabled;
        document.documentElement.classList.toggle('reduce-motion', enabled);
        localStorage.setItem('saksham-reduce-motion', enabled.toString());
        
        // Sync the checkbox
        const checkbox = document.getElementById('reduceMotionToggle');
        if (checkbox) checkbox.checked = enabled;
        
        this.announce(enabled ? 'Reduced motion enabled' : 'Reduced motion disabled');
    }

    /**
     * Reset all settings
     */
    resetSettings() {
        this.setFontSize(100);
        this.toggleHighContrast(false);
        this.toggleReduceMotion(false);
        
        const focusToggle = document.getElementById('focusHighlightToggle');
        if (focusToggle) focusToggle.checked = true;
        document.documentElement.classList.add('enhanced-focus');
        
        // Clear all saved preferences
        localStorage.removeItem('saksham-font-size');
        localStorage.removeItem('saksham-high-contrast');
        localStorage.removeItem('saksham-reduce-motion');
        localStorage.removeItem('saksham-enhanced-focus');
        
        // Reset CSS variable
        document.documentElement.style.removeProperty('--font-scale');
        document.body.style.removeProperty('font-size');
        
        this.announce('Accessibility settings reset to defaults');
    }

    /**
     * Trap focus within an element
     */
    trapFocus(element) {
        const focusableElements = element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        const trapHandler = (e) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable.focus();
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable.focus();
                }
            }
        };

        element.addEventListener('keydown', trapHandler);
        this.focusTrapStack.push({ element, handler: trapHandler });
    }

    /**
     * Release focus trap
     */
    releaseFocusTrap() {
        const trap = this.focusTrapStack.pop();
        if (trap) {
            trap.element.removeEventListener('keydown', trap.handler);
        }
    }

    /**
     * Enhance form labels and descriptions
     */
    enhanceFormLabels() {
        // Associate labels with inputs
        document.querySelectorAll('input, select, textarea').forEach(input => {
            const id = input.id;
            if (!id) return;

            // Find associated label
            let label = document.querySelector(`label[for="${id}"]`);
            
            if (!label) {
                // Check for wrapping label
                label = input.closest('label');
            }

            // Ensure proper association
            if (label && !input.getAttribute('aria-labelledby')) {
                if (!label.id) {
                    label.id = `${id}-label`;
                }
            }

            // Add required indicator for screen readers
            if (input.required && !input.getAttribute('aria-required')) {
                input.setAttribute('aria-required', 'true');
            }

            // Add invalid state handling
            input.addEventListener('invalid', () => {
                input.setAttribute('aria-invalid', 'true');
            });

            input.addEventListener('input', () => {
                if (input.validity.valid) {
                    input.setAttribute('aria-invalid', 'false');
                }
            });
        });
    }

    /**
     * Setup ARIA landmarks
     */
    setupLandmarks() {
        // Main content
        const mainContent = document.getElementById('main-content') || 
                           document.querySelector('.page.active');
        if (mainContent && !mainContent.getAttribute('role')) {
            mainContent.setAttribute('role', 'main');
        }

        // Navigation
        const nav = document.getElementById('mainNavbar');
        if (nav && !nav.getAttribute('role')) {
            nav.setAttribute('role', 'navigation');
            nav.setAttribute('aria-label', 'Main navigation');
        }

        // Add main id if missing
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => {
            if (!page.getAttribute('role')) {
                page.setAttribute('role', 'region');
            }
        });
    }

    /**
     * Check color contrast (utility)
     */
    checkContrast(foreground, background) {
        const getLuminance = (color) => {
            const rgb = color.match(/\d+/g).map(Number);
            const [r, g, b] = rgb.map(c => {
                c = c / 255;
                return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            });
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };

        const l1 = getLuminance(foreground);
        const l2 = getLuminance(background);
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

        return {
            ratio: ratio.toFixed(2),
            passesAA: ratio >= 4.5,
            passesAAA: ratio >= 7
        };
    }
}

// Create global instance
const a11y = new A11yManager();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { A11yManager, a11y };
} else {
    window.A11yManager = A11yManager;
    window.a11y = a11y;
}
