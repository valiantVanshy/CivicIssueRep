/**
 * Service Worker for Progressive Web App (PWA)
 * Enables offline functionality and caching
 * Uses network-first strategy for development
 */

const CACHE_NAME = 'saksham-v4';
const RUNTIME_CACHE = 'saksham-runtime-v2';

// Minimal assets to cache (only for offline fallback)
const PRECACHE_ASSETS = [
    '/offline.html'
];

// Install event - minimal caching
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Installing v4...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[ServiceWorker] Caching offline fallback');
                return cache.addAll(PRECACHE_ASSETS).catch(() => {
                    console.log('[ServiceWorker] Some assets failed to cache');
                });
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activating...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                        console.log('[ServiceWorker] Removing old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - NETWORK FIRST (always get fresh content)
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip requests for missing assets we know don't exist
    const url = new URL(event.request.url);
    const skipPaths = ['/road.jpg', '/favicon.ico', '/icons/icon-144x144.png', '/icons/icon-192x192.png'];
    if (skipPaths.some(path => url.pathname.endsWith(path))) {
        return;
    }

    // Network-first strategy: try network, fall back to cache
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(event.request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // Return offline page as last resort
                        return caches.match('/offline.html');
                    });
            })
    );
});

// Background sync for offline report submissions
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-reports') {
        event.waitUntil(syncReports());
    }
});

// Sync offline reports
async function syncReports() {
    try {
        const cache = await caches.open('offline-reports');
        const requests = await cache.keys();
        
        for (const request of requests) {
            try {
                const response = await cache.match(request);
                const data = await response.json();
                
                // Try to send to server
                await fetch('/api/reports', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                // If successful, remove from cache
                await cache.delete(request);
            } catch (error) {
                console.error('Failed to sync report:', error);
            }
        }
    } catch (error) {
        console.error('Sync failed:', error);
    }
}

// Push notification handler
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    
    const options = {
        body: data.body || 'New notification from SAKSHAM',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        vibrate: [200, 100, 200],
        data: data,
        actions: [
            {
                action: 'open',
                title: 'View'
            },
            {
                action: 'close',
                title: 'Dismiss'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'SAKSHAM', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.openWindow(event.notification.data.url || '/')
        );
    }
});

// Message handler for commands from the app
self.addEventListener('message', (event) => {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});
