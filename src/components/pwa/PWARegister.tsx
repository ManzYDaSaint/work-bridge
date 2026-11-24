"use client";

import { useEffect } from "react";
import { useOptionalUser } from "@/context/UserContext";
import { apiFetch } from "@/lib/api";

/**
 * Registers the service worker and — if the user is logged in — subscribes
 * them to Web Push so the server can deliver real-time push notifications.
 */
export default function PWARegister() {
    const userContext = useOptionalUser();
    const user = userContext?.user;

    // Step 1: Handle Service Worker lifecycle based on user role
    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

        // If the user is an EMPLOYER, keep service worker active (useful for desktop PWA notifications)
        if (user?.role === "EMPLOYER") {
            navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
                console.error("[SW] Employer registration failed:", err);
            });
            return;
        }

        // For JOB_SEEKER, ADMIN, or logged-out users:
        // Safely unregister any existing service worker and purge cached assets so they don't get stuck with stale web caches
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (const registration of registrations) {
                registration.unregister().catch(() => {});
            }
        });

        if ("caches" in window) {
            caches.keys().then((keys) => {
                keys.forEach((key) => {
                    caches.delete(key).catch(() => {});
                });
            });
        }
    }, [user?.role]);

    // Step 2: Subscribe to push strictly when EMPLOYER logs in
    useEffect(() => {
        if (!user?.id || user.role !== "EMPLOYER") return;
        if (!("PushManager" in window)) return;
        if (!("serviceWorker" in navigator)) return;

        const subscribeToPush = async () => {
            try {
                const sw = await navigator.serviceWorker.ready;

                // Fetch our VAPID public key from the server
                const keyRes = await apiFetch("/api/notifications/push-subscribe");
                if (!keyRes.ok) return; // Push not configured
                const { publicKey } = await keyRes.json();
                if (!publicKey) return;

                // Check if already subscribed
                const existing = await sw.pushManager.getSubscription();
                if (existing) return; // Already subscribed on this device

                // Subscribe the browser
                const subscription = await sw.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
                });

                // Save subscription to our database
                await apiFetch("/api/notifications/push-subscribe", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(subscription.toJSON()),
                });
            } catch (err) {
                // User denied notification permission — silently ignore
                console.warn("[PUSH] Subscription skipped:", err);
            }
        };

        subscribeToPush();
    }, [user?.id, user?.role]);

    return null;
}

/** Convert VAPID public key from base64url to Uint8Array (required by pushManager.subscribe) */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}
