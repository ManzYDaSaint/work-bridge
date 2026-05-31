"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase-client";

const AUTH_SIGNED_OUT_EVENT = "workbridge:auth-signed-out";
const AUTH_SIGNED_IN_EVENT = "workbridge:auth-signed-in";

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

export async function signOutAndRedirect(redirectUrl = "/login") {
    const supabase = createBrowserSupabaseClient();

    try {
        await supabase.auth.signOut();
    } catch (error) {
        console.error("Sign-out failed:", error);
    } finally {
        dispatchAuthSignedOutEvent();
        if (typeof window !== "undefined") {
            window.location.assign(redirectUrl);
        }
    }
}
