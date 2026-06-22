const CACHE_NAME = "aganyu-v3";
const STATIC_ASSETS = [
    "/",
    "/jobs",
    "/manifest.json",
    "/offline.html",
    "/favicon.ico",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/icons/apple-touch-icon.png",
    "/logo.svg",
];

// 1. Install - Cache Shell
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// 2. Activate - Cleanup old caches
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    event.waitUntil(self.clients.claim());
});

// 3. Fetch - Smart Caching
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== "GET") return;

    // Strategy for API/Data (Stale-While-Revalidate)
    if (url.origin === self.location.origin && (url.pathname.startsWith("/api/") || url.pathname === "/jobs")) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(request).then((cachedResponse) => {
                    const fetchPromise = fetch(request).then((networkResponse) => {
                        cache.put(request, networkResponse.clone());
                        return networkResponse;
                    });
                    return cachedResponse || fetchPromise;
                });
            })
        );
        return;
    }

    // Strategy for Static Assets (Cache First)
    event.respondWith(
        caches.match(request).then((cached) => {
            return cached || fetch(request).then((response) => {
                // Don't cache external API calls or non-standard responses
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                return response;
            });
        }).catch(() => {
            // Fallback for HTML pages
            if (request.headers.get("accept")?.includes("text/html")) {
                return caches.match("/offline.html");
            }
        })
    );
});

// 4. Background Sync Placeholder
self.addEventListener("sync", (event) => {
    if (event.tag === "sync-applications") {
        console.log("Background sync for applications triggered");
        // Logic to retry failed applications would go here
    }
});

// 5. Push Notifications — receive server push and display native notification
self.addEventListener("push", (event) => {
    if (!event.data) return;

    let payload = {};
    try {
        payload = event.data.json();
    } catch {
        payload = { title: "Aganyu", body: event.data.text(), url: "/" };
    }

    const { title = "Aganyu", body = "", icon = "/icons/icon-192.png", badge = "/icons/icon-192.png", url = "/", tag = "aganyu" } = payload;

    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            icon,
            badge,
            tag,               // Replaces existing notification with same tag (no stacking)
            renotify: true,    // Still vibrate/sound even if replacing
            data: { url },
        })
    );
});

// 6. Notification click — focus existing window or open new one
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || "/";

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
            // Try to focus an existing tab pointing to this URL
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && "focus" in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            // Otherwise open a new window
            return self.clients.openWindow(targetUrl);
        })
    );
});
