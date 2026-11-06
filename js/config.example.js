/**
 * Configuration Template
 * Copy this file to config.js and add public client configuration.
 * Keep Gemini API keys in the server environment, never in this file.
 */

const Config = {
    supabase: {
        url: 'YOUR_SUPABASE_URL',
        anonKey: 'YOUR_SUPABASE_ANON_KEY'
    },

    gemini: {
        model: 'gemini-2.0-flash-exp',
    },

    app: {
        name: 'SAKSHAM',
        version: '1.0.0',
        environment: 'development'
    },

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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Config;
} else {
    window.Config = Config;
}
