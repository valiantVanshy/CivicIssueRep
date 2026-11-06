/**
 * Auto-generated Configuration File
 * Generated at build time from environment variables
 * DO NOT EDIT MANUALLY
 */

const Config = {
    "supabase": {
        "url": "https://anyndqpkembxtuerezbd.supabase.co",
        "anonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFueW5kcXBrZW1ieHR1ZXJlemJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMDQ4MTUsImV4cCI6MjA3NTg4MDgxNX0.f0PlXfFpl9i0aUIOqrIg4CubWcahIdy47imv410CfWo"
    },
    "gemini": {
        "model": "gemini-2.0-flash",
        "rateLimitPerMinute": 10,
        "minRequestInterval": 4000
    },
    "app": {
        "name": "SAKSHAM",
        "version": "1.0.0",
        "environment": "production"
    },
    "upload": {
        "maxFileSize": 5242880,
        "allowedImageTypes": [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp"
        ],
        "compressionQuality": 0.8
    },
    "map": {
        "defaultCenter": [
            20.5937,
            78.9629
        ],
        "defaultZoom": 5,
        "tileLayer": "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "attribution": "© OpenStreetMap contributors"
    },
    "security": {
        "passwordMinLength": 6,
        "saltRounds": 10,
        "sessionTimeout": 86400000
    },
    "validation": {
        "email": /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "phone": /^[0-9]{10}$/,
        "minTitleLength": 10,
        "maxTitleLength": 255,
        "minDescriptionLength": 20,
        "maxDescriptionLength": 2000
    }
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Config;
} else {
    window.Config = Config;
}
