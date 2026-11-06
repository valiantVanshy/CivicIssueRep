#!/usr/bin/env node
/**
 * Build script to generate config.js from environment variables
 * This runs during Vercel build process
 */

const fs = require('fs');
const path = require('path');

// Only public configuration belongs in the browser bundle.
const config = {
    supabase: {
        url: process.env.SUPABASE_URL || 'https://anyndqpkembxtuerezbd.supabase.co',
        anonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFueW5kcXBrZW1ieHR1ZXJlemJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMDQ4MTUsImV4cCI6MjA3NTg4MDgxNX0.f0PlXfFpl9i0aUIOqrIg4CubWcahIdy47imv410CfWo'
    },
    gemini: {
        model: 'gemini-2.0-flash',
        rateLimitPerMinute: 10,
        minRequestInterval: 4000
    },
    app: {
        name: 'SAKSHAM',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'production'
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
        email: 'REGEX:/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/',
        phone: 'REGEX:/^[0-9]{10}$/',
        minTitleLength: 10,
        maxTitleLength: 255,
        minDescriptionLength: 20,
        maxDescriptionLength: 2000
    }
};

// Generate the config file content - properly handle regex patterns
const configJson = JSON.stringify(config, null, 4);

// Replace regex placeholders with actual regex literals
const configWithRegex = configJson.replace(
    /"REGEX:\/\^(.+?)\$\/"/g,
    (match, pattern) => {
        // Unescape the double backslashes that JSON.stringify added
        const unescaped = pattern.replace(/\\\\/g, '\\');
        return `/^${unescaped}$/`;
    }
);

const configContent = `/**
 * Auto-generated Configuration File
 * Generated at build time from environment variables
 * DO NOT EDIT MANUALLY
 */

const Config = ${configWithRegex};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Config;
} else {
    window.Config = Config;
}
`;

// Write to js/config.js
const outputPath = path.join(__dirname, 'js', 'config.js');
fs.writeFileSync(outputPath, configContent);

console.log('✅ Config file generated successfully at:', outputPath);
console.log('📝 Using environment:', config.app.environment);
