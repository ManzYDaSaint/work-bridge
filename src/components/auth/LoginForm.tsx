"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock } from "lucide-react";
import { showErrorToast } from "@/lib/toasts";

export default function LoginForm() {
    const searchParams = useSearchParams();
    const isTimeout = searchParams.get("timeout") === "true";
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const supabase = createBrowserSupabaseClient();

    useEffect(() => {
        fetch("/api/metrics/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventName: "visit_login", stage: "visit" }),
        }).catch(() => undefined);
    }, []);

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            showErrorToast(error);
            setIsLoading(false);
            return;
        }

        // Full navigation so @supabase/ssr cookie session is present before RSC/middleware run
        // (client router transitions can race ahead of persisted auth cookies).
        window.location.assign("/dashboard");
    };

    return (
        <div className="w-full">
            <div className="mb-8 text-center">
                <Link href="/" className="inline-flex items-center justify-center mb-5" aria-label="Go to home">
                    <div className="logo-black">
                        <Image src="/logo-black.svg" alt="WorkBridge" width={48} height={48} priority />
                    </div>
                    <div className="logo-white">
                        <Image src="/logo.svg" alt="WorkBridge" width={48} height={48} priority />
                    </div>
                </Link>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Welcome back</h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Sign in to continue</p>
            </div>

            {isTimeout && (
                <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200">
                    <div className="flex items-start gap-3">
                        <Clock size={16} className="mt-0.5 shrink-0" />
                        <p className="text-sm">Session timed out after inactivity. Please sign in again.</p>
                    </div>
                </div>
            )}

            <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80 sm:p-7">
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                    <div className="space-y-1.5">
                        <label htmlFor="email" className="text-xs font-medium text-slate-600 dark:text-slate-300">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                            <label htmlFor="password" className="text-xs font-medium text-slate-600 dark:text-slate-300">Password</label>
                            <Link href="/auth/forgot-password" title="forgot-password" className="text-xs text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                                Forgot password?
                            </Link>
                        </div>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                    >
                        {isLoading ? "Signing in..." : "Sign in"}
                        <ArrowRight size={16} />
                    </button>
                </form>
            </div>

            <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                New to WorkBridge?{" "}
                <Link href="/register" className="font-medium text-slate-900 hover:underline dark:text-slate-100">
                    Create account
                </Link>
            </p>
        </div>
    );
}
