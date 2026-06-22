"use client";

import { useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { apiFetch } from "@/lib/api";

/**
 * Registers the service worker and — if the user is logged in — subscribes
 * them to Web Push so the server can deliver real-time push notifications.
 */
export default function PWARegister() {
    const { user } = useUser();

    // Step 1: Register service worker on mount
    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

        navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
            console.error("[SW] Registration failed:", err);
        });
    }, []);

    // Step 2: Subscribe to push when user logs in
    useEffect(() => {
        if (!user?.id) return;
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
    }, [user?.id]);

    return null;
}

/** Convert VAPID public key from base64url to Uint8Array (required by pushManager.subscribe) */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}
