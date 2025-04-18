/**
 * PDF Multi-Tools Service Worker
 * A minimal service worker to prevent 404 errors
 */

// Service worker version
const CACHE_VERSION = 'v1';
const CACHE_NAME = `pdf-tools-${CACHE_VERSION}`;

// Install event - create cache
self.addEventListener('install', event => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activated');
  return self.clients.claim();
});

// Fetch event - currently just passes through all requests
self.addEventListener('fetch', event => {
  // Just pass through all requests for now
  event.respondWith(fetch(event.request));
}); 