// sw.js
/**
 * @fileoverview Service Worker for Orbital Trading PWA.
 * Handles local caching of core assets to enable offline playability and rapid subsequent load times.
 */

const CACHE_NAME = 'orbital-trading-1777695872321';

const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/bundle.min.js',
    '/manifest.json',
    '/favicon.svg'
];

/**
 * Install Event
 * Pre-caches the essential static assets when the Service Worker is first registered.
 */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Use Promise.allSettled to gracefully install even if some dist/ assets are missing in dev environments
            return Promise.allSettled(
                ASSETS_TO_CACHE.map(asset => 
                    fetch(asset).then(response => {
                        if (!response.ok) throw new Error(`Failed to fetch ${asset}`);
                        return cache.put(asset, response);
                    })
                )
            );
        })
    );
});

/**
 * Fetch Event
 * Intercepts network requests and serves them from the local cache if available, 
 * falling back to the network if the resource is not cached.
 */
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});

/**
 * Activate Event
 * Cleans up old, obsolete caches when a new version of the Service Worker activates.
 */
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});