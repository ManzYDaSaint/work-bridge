import { createBrowserSupabaseClient } from "@/lib/supabase-client";

/**
 * Same browser Supabase client as dashboard layouts — one cookie/session store.
 */
const getAccessToken = async (): Promise<string> => {
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) return "";
    return data.session?.access_token ?? "";
};

/**
 * Authenticated fetch for this Next app only: same-origin relative paths, cookies + optional Bearer.
 * Do not set NEXT_PUBLIC_API_BASE_URL to a different host than the page unless CORS + credentials are configured.
 */
export const apiFetch = async (
    path: string,
    options: RequestInit = {}
): Promise<Response> => {
    const token = await getAccessToken();
    const headers = new Headers(options.headers as HeadersInit ?? {});

    if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const url =
        path.startsWith("http://") || path.startsWith("https://")
            ? path
            : path.startsWith("/")
              ? path
              : `/${path}`;

    return fetch(url, {
        cache: "no-store",
        credentials: "include",
        ...options,
        headers,
    });
};

export const apiFetchJson = async <T = unknown>(
    path: string,
    options: RequestInit = {}
): Promise<T> => {
    const headers = new Headers(options.headers as HeadersInit ?? {});
    if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    const res = await apiFetch(path, { ...options, headers });
    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error((error as { error?: string }).error || `Request failed with status ${res.status}`);
    }
    return res.json() as Promise<T>;
};
