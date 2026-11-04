// TempoCare Service Worker (No-Op)
// Resolves browser extension / PWA service worker probing without 404 logs
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

