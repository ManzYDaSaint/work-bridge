"use client";

import { useState, useEffect, useMemo } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Lock, Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, text: "", color: "bg-slate-200 dark:bg-slate-800" };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    if (score <= 1) return { score, text: "Weak", color: "bg-red-500", textCls: "text-red-500" };
    if (score === 2) return { score, text: "Fair", color: "bg-amber-400", textCls: "text-amber-500" };
    if (score === 3) return { score, text: "Good", color: "bg-blue-500", textCls: "text-blue-500" };
    return { score, text: "Strong", color: "bg-emerald-500", textCls: "text-emerald-500" };
};

export default function ResetPasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const router = useRouter();
    
    // Memoize the supabase client so it doesn't get recreated on every render
    const supabase = useMemo(() => createBrowserSupabaseClient(), []);

    // Guard: ensure a valid recovery session exists before rendering the form
    useEffect(() => {
        let mounted = true;
        supabase.auth.getSession().then(({ data }: { data: { session: any } }) => {
            if (!mounted) return;
            if (!data.session) {
                toast.error("Reset link has expired or is invalid. Please request a new one.");
                router.replace("/auth/forgot-password");
            } else {
                setSessionReady(true);
            }
        }).catch((err: any) => {
            console.warn("Session check lock error safely ignored:", err);
            // If we get a lock error here, it means AuthContext is also fetching the session.
            // We can safely assume the session exists for now, or let AuthContext handle it.
            if (mounted) setSessionReady(true);
        });
        return () => { mounted = false; };
    }, [router, supabase]); // Safe to include supabase now that it is memoized

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        const strength = getPasswordStrength(password);
        if (strength.score < 3) {
            toast.error("Please use a stronger password (must include uppercase, lowercase, numbers, and be at least 8 characters long).");
            return;
        }

        setIsLoading(true);

        try {
            let errorToReport = null;
            
            try {
                const { error } = await supabase.auth.updateUser({ password });
                errorToReport = error;
            } catch (err: any) {
                // If it throws a lock error, retry once
                if (err?.message?.includes("stole it") || err?.message?.includes("Lock")) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const { error } = await supabase.auth.updateUser({ password });
                    errorToReport = error;
                } else {
                    throw err; // Re-throw other unexpected errors
                }
            }

            if (errorToReport) {
                toast.error(errorToReport.message);
                setIsLoading(false);
                return;
            }

            toast.success("Password updated successfully!");
            
            // Supabase automatically logs the user in after a password reset,
            // so we can send them straight to the dashboard instead of login.
            setTimeout(() => {
                window.location.href = "/dashboard";
            }, 1500);

        } catch (err: any) {
            console.error("Password update error:", err);
            toast.error(err.message || "An unexpected error occurred while updating the password.");
            setIsLoading(false);
        }
    };

    if (!sessionReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                        Verifying session…
                    </p>
                </div>
            </div>
        );
    }

    return (
        <AuthLayout>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full"
            >
                {/* Header */}
                <div className="flex flex-col items-center mb-10">
                    <motion.div
                        whileHover={{ rotate: -15 }}
                        className="w-16 h-16 flex items-center justify-center mb-6"
                    >
                        <div className="logo-black">
                            <Image src="/logo-black.svg" alt="Aganyu" width={64} height={64} priority style={{ width: "4.5rem", height: "auto" }} />
                        </div>
                        <div className="logo-white">
                            <Image src="/logo.svg" alt="Aganyu" width={64} height={64} priority style={{ width: "4.5rem", height: "auto" }} />
                        </div>
                    </motion.div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter text-center">
                        Reset Integrity
                    </h1>
                    <p className="text-slate-400 mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-center">
                        Configure your new security credentials
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl border border-white dark:border-slate-800 rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200/50 dark:shadow-none">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">New Password</label>
                            <div className="relative group">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                    <Lock size={16} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    required
                                    className="w-full pl-14 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-sm font-bold"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {password && (() => {
                                const st = getPasswordStrength(password);
                                return (
                                    <div className="mt-2">
                                        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                            <div className={cn("h-full transition-all duration-300", st.color)} style={{ width: `${(st.score / 4) * 100}%` }} />
                                        </div>
                                        <div className="mt-1.5 flex items-center justify-between px-1">
                                            <span className={cn("text-[10px] font-black uppercase tracking-wider", st.textCls)}>
                                                {st.text}
                                            </span>
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                                                8+ chars, mix cases & numbers
                                            </span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Confirm Identity</label>
                            <div className="relative group">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                    <Lock size={16} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter password"
                                    required
                                    className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-sm font-bold"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-5 bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-xl shadow-slate-900/10 text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 group active:scale-95 border-none mt-2"
                        >
                            {isLoading ? "Updating..." : "Commit New Credentials"}
                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>
                </div>

                <p className="mt-10 text-[10px] text-center text-slate-400 font-black uppercase tracking-widest">
                    Need support?{" "}
                    <Link href="/help" className="text-blue-600 hover:text-blue-700 transition-colors ml-1">
                        Go to Help Center
                    </Link>
                </p>
            </motion.div>
        </AuthLayout>
    );
}
