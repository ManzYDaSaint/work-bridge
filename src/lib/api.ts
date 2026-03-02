import { createBrowserClient } from "@supabase/ssr";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "";

/**
 * Get the current Supabase session token (client-side).
 * Falls back to an empty string if no session exists.
 * Uses @supabase/ssr directly to avoid importing the server-only supabase.ts module.
 */
const getAccessToken = async (): Promise<string> => {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    );
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? "";
};

/**
 * Authenticated fetch wrapper — attaches the Supabase session token as Bearer.
 * Mirrors the original WorkBridgeApp `apiFetch` but uses Supabase auth instead of localStorage.
 */
export const apiFetch = async (
    path: string,
    options: RequestInit = {}
): Promise<Response> => {
    const token = await getAccessToken();
    const headers = new Headers(options.headers as Record<string, string> ?? {});

    if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
    });
};

/**
 * Convenience wrapper that sets Content-Type to application/json automatically.
 */
export const apiFetchJson = async (
    path: string,
    options: RequestInit = {}
): Promise<Response> => {
    const headers = new Headers(options.headers as Record<string, string> ?? {});
    if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    return apiFetch(path, { ...options, headers });
};
