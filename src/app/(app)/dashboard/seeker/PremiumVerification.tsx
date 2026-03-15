"use client";

import { useState } from "react";
import { CreditCard, ShieldCheck, Sparkles, Loader2, Zap, CheckCircle2, Star } from "lucide-react";
import { initializeBadgePayment, initializeAISubscriptionPayment } from "./actions";
import { motion } from "framer-motion";

interface PremiumVerificationProps {
    hasBadge?: boolean;
    isSubscribed?: boolean;
    badgeSeekerNumber?: number;
}

export function PremiumVerification({ hasBadge = false, isSubscribed = false, badgeSeekerNumber }: PremiumVerificationProps) {
    const [loadingBadge, setLoadingBadge] = useState(false);
    const [loadingAI, setLoadingAI] = useState(false);

    const handleBadgePayment = async () => {
        setLoadingBadge(true);
        try {
            const res = await initializeBadgePayment();
            if (res.success && res.config) {
                const config = res.config;
                // In production: FlutterwaveCheckout(config)
                window.location.href = config.redirect_url;
            } else {
                alert(res.error || "Payment failed to initialize");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingBadge(false);
        }
    };

    const handleAIPayment = async () => {
        setLoadingAI(true);
        try {
            const res = await initializeAISubscriptionPayment();
            if (res.success && res.config) {
                const config = res.config;
                window.location.href = config.redirect_url;
            } else {
                alert(res.error || "Payment failed to initialize");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingAI(false);
        }
    };

    // If both active, show compact success state
    if (hasBadge && isSubscribed) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-emerald-900 to-teal-950 rounded-[2.5rem] py-4 px-6 shadow-3xl relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 blur-[100px]" />
                <div className="relative z-10 flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                        <CheckCircle2 className="text-emerald-400" size={32} />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-emerald-400 font-black text-sm">WorkBridge Badge Active</span>
                            {badgeSeekerNumber && (
                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-400/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                    #{badgeSeekerNumber}
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-emerald-600 font-medium">Badge · AI Features · Full Access</p>
                    </div>
                    <Sparkles className="text-emerald-400 animate-pulse" size={24} />
                </div>
            </motion.div>
        );
    }

    return (
        <div className="space-y-4">
            {/* ── BADGE CARD ─────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-[2.5rem] py-4 px-6 shadow-3xl relative overflow-hidden group"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/20 blur-[100px] animate-pulse" />
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-purple-500/10 blur-[120px]" />

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-xl border border-white/20 shrink-0 shadow-2xl">
                        <Star className="text-blue-400" size={28} fill="currentColor" />
                    </div>

                    <div className="flex-1 space-y-3 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 px-4 py-1.5 rounded-full border border-blue-500/30">
                            <ShieldCheck size={14} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">WorkBridge Badge</span>
                        </div>

                        <h2 className="text-2xl font-black text-white tracking-tight leading-none italic">
                            Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Trusted Identity</span>
                        </h2>

                        <p className="text-slate-400 text-xs font-medium max-w-md">
                            Unlocks profile updates, resume visibility, and employer discovery. The first <span className="text-blue-300 font-bold">100 seekers</span> receive it free.
                        </p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-5 rounded-[2rem] w-full md:w-auto text-center space-y-3 shadow-2xl">
                        {hasBadge ? (
                            <div className="flex flex-col items-center gap-2">
                                <CheckCircle2 size={36} className="text-emerald-400" />
                                <p className="text-emerald-400 font-black text-xs uppercase tracking-widest">Badge Active</p>
                                {badgeSeekerNumber && (
                                    <p className="text-[9px] text-slate-500">Member #{badgeSeekerNumber}</p>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">One-Time Fee</p>
                                    <p className="text-4xl font-black text-white italic">MK3,000</p>
                                </div>
                                <button
                                    onClick={handleBadgePayment}
                                    disabled={loadingBadge}
                                    className="w-full p-3.5 bg-white text-slate-900 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-400 hover:text-white transition-all active:scale-95 shadow-xl shadow-blue-500/10"
                                >
                                    {loadingBadge ? <Loader2 className="animate-spin" size={18} /> : (
                                        <>Get Badge <ShieldCheck size={14} /></>
                                    )}
                                </button>
                                <p className="text-[9px] font-bold text-slate-500 max-w-[150px] mx-auto leading-tight">
                                    Secure payment via <span className="text-slate-300">Flutterwave</span>
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* ── AI FEATURES CARD ─────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 }}
                className="bg-gradient-to-br from-indigo-950 to-purple-950 rounded-[2.5rem] py-4 px-6 shadow-3xl relative overflow-hidden group"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-400/20 blur-[100px]" />

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-xl border border-white/20 shrink-0 shadow-2xl">
                        <Zap className="text-purple-400" size={28} fill="currentColor" />
                    </div>

                    <div className="flex-1 space-y-3 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-300 px-4 py-1.5 rounded-full border border-purple-500/30">
                            <Sparkles size={14} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">AI Features Plan</span>
                        </div>

                        <h2 className="text-2xl font-black text-white tracking-tight leading-none italic">
                            Elite AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300">Discovery</span>
                        </h2>

                        <p className="text-slate-400 text-xs font-medium max-w-md">
                            AI-powered job matching, anonymized CV generation, and priority employer visibility. Monthly plan.
                        </p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-5 rounded-[2rem] w-full md:w-auto text-center space-y-3 shadow-2xl">
                        {isSubscribed ? (
                            <div className="flex flex-col items-center gap-2">
                                <CheckCircle2 size={36} className="text-purple-400" />
                                <p className="text-purple-400 font-black text-xs uppercase tracking-widest">AI Active</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em]">Monthly</p>
                                    <p className="text-4xl font-black text-white italic">MK2,000</p>
                                </div>
                                <button
                                    onClick={handleAIPayment}
                                    disabled={loadingAI}
                                    className="w-full p-3.5 bg-white text-slate-900 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-purple-400 hover:text-white transition-all active:scale-95 shadow-xl shadow-purple-500/10"
                                >
                                    {loadingAI ? <Loader2 className="animate-spin" size={18} /> : (
                                        <>Activate AI <Sparkles size={14} /></>
                                    )}
                                </button>
                                <p className="text-[9px] font-bold text-slate-500 max-w-[150px] mx-auto leading-tight">
                                    Secure payment via <span className="text-slate-300">Flutterwave</span>
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
