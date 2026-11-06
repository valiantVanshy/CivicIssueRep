/**
 * Progressive Web App (PWA) Installer
 * Handles service worker registration and app installation
 */

class PWAInstaller {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.init();
    }

    /**
     * Initialize PWA
     */
    async init() {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            this.isInstalled = true;
            console.log('[PWA] Running as installed app');
        }

        // Register service worker
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('[PWA] Service Worker registered:', registration.scope);

                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateNotification();
                        }
                    });
                });
            } catch (error) {
                console.error('[PWA] Service Worker registration failed:', error);
            }
        }

        // Handle install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
        });

        // Handle app installed
        window.addEventListener('appinstalled', () => {
            console.log('[PWA] App was installed');
            this.isInstalled = true;
            this.hideInstallButton();
        });

        // Request notification permission
        this.requestNotificationPermission();
    }

    /**
     * Show install button
     */
    showInstallButton() {
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) {
            installBtn.style.display = 'block';
            installBtn.onclick = () => this.promptInstall();
        } else {
            // Create floating install button
            const btn = document.createElement('button');
            btn.id = 'pwa-install-btn';
            btn.className = 'pwa-install-button';
            btn.innerHTML = '📥 Install App';
            btn.onclick = () => this.promptInstall();
            document.body.appendChild(btn);
        }
    }

    /**
     * Hide install button
     */
    hideInstallButton() {
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) {
            installBtn.style.display = 'none';
        }
    }

    /**
     * Prompt user to install
     */
    async promptInstall() {
        if (!this.deferredPrompt) {
            return;
        }

        this.deferredPrompt.prompt();

        const { outcome } = await this.deferredPrompt.userChoice;
        console.log('[PWA] User response:', outcome);

        this.deferredPrompt = null;
        this.hideInstallButton();
    }

    /**
     * Request notification permission
     */
    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            // Don't ask immediately, wait for user action
            setTimeout(() => {
                Notification.requestPermission().then(permission => {
                    console.log('[PWA] Notification permission:', permission);
                });
            }, 5000);
        }
    }

    /**
     * Show update notification
     */
    showUpdateNotification() {
        const notification = document.createElement('div');
        notification.className = 'pwa-update-notification';
        notification.innerHTML = `
            <div class="pwa-update-content">
                <span>🔄 New version available!</span>
                <button id="pwa-update-btn" class="btn btn--primary btn-sm">Update Now</button>
            </div>
        `;
        document.body.appendChild(notification);

        document.getElementById('pwa-update-btn').onclick = () => {
            window.location.reload();
        };
    }

    /**
     * Check if app is installed
     */
    isAppInstalled() {
        return this.isInstalled;
    }

    /**
     * Check if service worker is supported
     */
    isSupported() {
        return 'serviceWorker' in navigator;
    }
}

// Auto-initialize
const pwaInstaller = new PWAInstaller();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PWAInstaller, pwaInstaller };
} else {
    window.PWAInstaller = PWAInstaller;
    window.pwaInstaller = pwaInstaller;
}
