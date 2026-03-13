/* eslint-disable no-restricted-globals */

// This is a minimal service worker to enable PWA features and handle notifications
const CACHE_NAME = 'workbridge-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Basic passthrough for now, can be enhanced with caching later
    event.respondWith(fetch(event.request));
});

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // Open the app or a specific URL
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            if (clientList.length > 0) {
                let client = clientList[0];
                for (let i = 0; i < clientList.length; i++) {
                    if (clientList[i].focused) {
                        client = clientList[i];
                    }
                }
                return client.focus();
            }
            return self.clients.openWindow('/');
        })
    );
});
