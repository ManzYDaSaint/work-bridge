"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";
import { toast } from "sonner";
import { Suspense } from "react";

/**
 * /auth/confirm
 *
 * Handles two auth token delivery modes from Supabase emails:
 *
 * 1. PKCE flow (default with @supabase/ssr):
 *    URL contains ?code=xxx  → exchange via exchangeCodeForSession()
 *
 * 2. Implicit / legacy flow:
 *    URL contains #access_token=xxx → exchange via setSession()
 *
 * After establishing the session, redirects to the appropriate page.
 */
function AuthConfirmInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createBrowserSupabaseClient();
    const handled = useRef(false);

    useEffect(() => {
        if (handled.current) return;
        handled.current = true;

        const code = searchParams.get("code");
        const next = searchParams.get("next") ?? "/dashboard";
        const type = searchParams.get("type");

        if (code) {
            // PKCE flow: exchange code for session server-side style (client)
            supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
                if (error) {
                    toast.error("Link has expired. Please request a new one.");
                    router.replace("/auth/forgot-password");
                    return;
                }
                const destination = type === "recovery" ? "/auth/reset-password" : next;
                router.replace(destination);
            });
            return;
        }

        // Implicit/legacy flow: read hash fragment
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const hashType = params.get("type");

        if (accessToken && refreshToken) {
            supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
                .then(({ error }) => {
                    if (error) {
                        toast.error("Link has expired. Please request a new one.");
                        router.replace("/auth/forgot-password");
                        return;
                    }
                    const destination = hashType === "recovery" ? "/auth/reset-password" : next;
                    router.replace(destination);
                });
            return;
        }

        // No token found in either location
        toast.error("Invalid or expired link. Please request a new one.");
        router.replace("/auth/forgot-password");
    }, [router, searchParams, supabase]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                    Verifying link…
                </p>
            </div>
        </div>
    );
}

export default function AuthConfirmPage() {
    return (
        <Suspense>
            <AuthConfirmInner />
        </Suspense>
    );
}
