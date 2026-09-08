"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase-client";

const AUTH_SIGNED_OUT_EVENT = "aganyu:auth-signed-out";
const AUTH_SIGNED_IN_EVENT = "aganyu:auth-signed-in";

export function dispatchAuthSignedOutEvent() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(AUTH_SIGNED_OUT_EVENT));
}

export function subscribeToAuthSignedOut(handler: () => void) {
    if (typeof window === "undefined") return () => undefined;
    window.addEventListener(AUTH_SIGNED_OUT_EVENT, handler);
    return () => window.removeEventListener(AUTH_SIGNED_OUT_EVENT, handler);
}

export function dispatchAuthSignedInEvent() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(AUTH_SIGNED_IN_EVENT));
}

export function subscribeToAuthSignedIn(handler: () => void) {
    if (typeof window === "undefined") return () => undefined;
    window.addEventListener(AUTH_SIGNED_IN_EVENT, handler);
    return () => window.removeEventListener(AUTH_SIGNED_IN_EVENT, handler);
}

function clearAllCookies() {
    if (typeof document === "undefined") return;

    const cookieNames = new Set(
        document.cookie
            .split(";")
            .map((cookie) => cookie.trim())
            .filter(Boolean)
            .map((cookie) => cookie.split("=")[0])
    );

    cookieNames.forEach((name) => {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}; SameSite=Lax`;
    });
}

async function clearBrowserState() {
    if (typeof window === "undefined") return;

    try {
        clearAllCookies();
    } catch (error) {
        console.error("Failed to clear cookies during logout:", error);
    }

    try {
        window.localStorage.clear();
        window.sessionStorage.clear();
    } catch (error) {
        console.error("Failed to clear browser storage during logout:", error);
    }

    try {
        if ("caches" in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
        }
    } catch (error) {
        console.error("Failed to clear cache during logout:", error);
    }

    try {
        if ("serviceWorker" in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map((registration) => registration.unregister()));
        }
    } catch (error) {
        console.error("Failed to unregister service workers during logout:", error);
    }
}

export async function signOutAndRedirect(redirectUrl = "/login") {
    const supabase = createBrowserSupabaseClient();

    try {
        await supabase.auth.signOut();
    } catch (error) {
        console.error("Sign-out failed:", error);
    }

    try {
        const response = await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            console.warn("Server logout endpoint returned a non-OK status:", response.status);
        }
    } catch (error) {
        console.error("Server logout request failed:", error);
    }

    try {
        await clearBrowserState();
    } catch (error) {
        console.error("Browser cleanup failed during sign-out:", error);
    }

    dispatchAuthSignedOutEvent();

    if (typeof window !== "undefined") {
        window.location.assign(redirectUrl);
    }
}
