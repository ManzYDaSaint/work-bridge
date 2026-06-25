"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";
import { toast } from "sonner";

/**
 * /auth/confirm
 *
 * This page handles the hash-fragment token that Supabase embeds in
 * password-reset (and email-change) emails:
 *
 *   https://www.aganyu.com/auth/confirm#access_token=...&type=recovery
 *
 * Hash fragments are never sent to the server, so they MUST be consumed
 * client-side.  Once the session is established we redirect the user to
 * the appropriate page.
 */
export default function AuthConfirmPage() {
    const router = useRouter();
    const supabase = createBrowserSupabaseClient();
    const handled = useRef(false);

    useEffect(() => {
        if (handled.current) return;
        handled.current = true;

        const hash = window.location.hash.substring(1); // strip leading #
        const params = new URLSearchParams(hash);

        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const type = params.get("type"); // "recovery" | "signup" | "magiclink" | etc.
        const next = params.get("next") ?? "/dashboard";

        if (!accessToken || !refreshToken) {
            toast.error("Invalid or expired link. Please request a new one.");
            router.replace("/auth/forgot-password");
            return;
        }

        supabase.auth
            .setSession({ access_token: accessToken, refresh_token: refreshToken })
            .then(({ error }) => {
                if (error) {
                    toast.error("Link has expired. Please request a new reset link.");
                    router.replace("/auth/forgot-password");
                    return;
                }

                if (type === "recovery") {
                    // Send the user to the reset-password form — session is now live
                    router.replace("/auth/reset-password");
                } else {
                    // email confirmation, magic link, etc.
                    router.replace(next);
                }
            });
    }, [router, supabase]);

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
