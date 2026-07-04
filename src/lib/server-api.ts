import { getSiteUrl } from "@/lib/site-url";

/**
 * Server-side authenticated fetch for this Next app only.
 * Uses createSupabaseServerClient to get the access token and getSiteUrl for absolute paths.
 */
export const serverApiFetch = async (
    path: string,
    options: RequestInit = {}
): Promise<Response> => {
    const { createSupabaseServerClient } = await import("@/lib/supabase-server");
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const headers = new Headers(options.headers as HeadersInit ?? {});
    if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const origin = getSiteUrl();
    const url = path.startsWith("http") ? path : `${origin}${path.startsWith("/") ? "" : "/"}${path}`;

    return fetch(url, {
        cache: "no-store",
        ...options,
        headers,
    });
};

export const serverApiFetchJson = async <T = unknown>(
    path: string,
    options: RequestInit = {}
): Promise<T> => {
    const headers = new Headers(options.headers as HeadersInit ?? {});
    if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    const res = await serverApiFetch(path, { ...options, headers });
    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error((error as { error?: string }).error || `Request failed with status ${res.status}`);
    }
    return res.json() as Promise<T>;
};
