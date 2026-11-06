/**
 * Configuration Loader
 * Works both locally (uses js/config.js) and on Vercel (uses /api/config endpoint)
 */

(async function loadConfig() {
    // Check if Config is already loaded (local development)
    if (typeof window.Config !== 'undefined') {
        console.log('Using local config');
        return;
    }

    try {
        // Try to fetch from Vercel serverless function
        const response = await fetch('/api/config');
        if (response.ok) {
            const config = await response.json();
            window.Config = {
                ...config,
                // Add static config that doesn't need to be in env vars
                upload: {
                    maxFileSize: 5 * 1024 * 1024,
                    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
                    compressionQuality: 0.8
                },
                map: {
                    defaultCenter: [20.5937, 78.9629],
                    defaultZoom: 5,
                    tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                    attribution: '© OpenStreetMap contributors'
                },
                security: {
                    passwordMinLength: 6,
                    saltRounds: 10,
                    sessionTimeout: 24 * 60 * 60 * 1000
                },
                validation: {
                    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    phone: /^[0-9]{10}$/,
                    minTitleLength: 10,
                    maxTitleLength: 255,
                    minDescriptionLength: 20,
                    maxDescriptionLength: 2000
                }
            };
            console.log('Config loaded from API');
        } else {
            throw new Error('API config not available');
        }
    } catch (error) {
        console.warn('Could not load config from API, checking for local config:', error.message);
        
        // Fallback: Check if local config exists
        if (typeof window.Config === 'undefined') {
            console.error('No configuration found! Please set up js/config.js for local development or environment variables for Vercel.');
        }
    }
})();
