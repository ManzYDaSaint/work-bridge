"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";
import Link from "next/link";
import { Sparkles, ArrowRight, Mail, CheckCircle2 } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const supabase = createBrowserSupabaseClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/reset-password`,
        });

        if (error) {
            toast.error(error.message);
        } else {
            setIsSent(true);
            toast.success("Reset link sent! Check your inbox.");
        }
        setIsLoading(false);
    };

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
                        whileHover={{ rotate: 15 }}
                        className="w-16 h-16 bg-blue-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/20"
                    >
                        <Sparkles className="w-9 h-9 text-white" />
                    </motion.div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter text-center">
                        Recover Access
                    </h1>
                    <p className="text-slate-400 mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-center text-center">
                        We'll broadcast a secure link to your inbox
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white/90 backdrop-blur-3xl border border-white rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200/50">
                    {!isSent ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Identity Credentials</label>
                                <div className="relative group">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                        <Mail size={16} />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter your email"
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
                                {isLoading ? "Broadcasting..." : "Dispatch Reset Signal"}
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </form>
                    ) : (
                        <div className="text-center py-4 space-y-8">
                            <div className="flex justify-center">
                                <motion.div
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="w-20 h-20 bg-green-50 rounded-[2rem] flex items-center justify-center text-green-500"
                                >
                                    <CheckCircle2 size={40} />
                                </motion.div>
                            </div>
                            <div className="space-y-3">
                                <p className="text-xl font-black text-slate-900 tracking-tight uppercase">Signal Intercepted</p>
                                <p className="text-sm text-slate-500 font-bold leading-relaxed px-4 text-center">
                                    A recovery link has been sent to <span className="text-blue-600 italic font-black">{email}</span>.
                                    Follow the instructions to restore your credentials.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsSent(false)}
                                className="text-[9px] text-slate-400 hover:text-blue-600 font-black uppercase tracking-[0.3em] transition-colors"
                            >
                                Send recovery again
                            </button>
                        </div>
                    )}
                </div>

                <p className="mt-10 text-[10px] text-center text-slate-400 font-black uppercase tracking-widest">
                    Remembered your credentials?{" "}
                    <Link href="/login" className="text-blue-600 hover:text-blue-700 transition-colors ml-1">
                        Sign In
                    </Link>
                </p>
            </motion.div>
        </AuthLayout>
    );
}
