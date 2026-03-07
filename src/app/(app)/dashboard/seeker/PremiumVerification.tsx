"use client";

import { useState } from "react";
import { CreditCard, ShieldCheck, Sparkles, Loader2, Zap } from "lucide-react";
import { initializeVerificationPayment } from "./actions";
import { motion } from "framer-motion";

export function PremiumVerification() {
    const [loading, setLoading] = useState(false);

    const handleUpgrade = async () => {
        setLoading(true);
        try {
            const res = await initializeVerificationPayment();
            if (res.success && res.config) {
                // Initialize Flutterwave checkout
                // In a production environment, we'd load the script dynamically or use the SDK
                // For this MVP demonstration, we simulate the redirection to the payment link
                const config = res.config;

                // Constructing a simulated Flutterwave payment URL for demo purposes
                // Real implementation would use: FlutterwaveCheckout(config)
                alert(`Redirecting to Flutterwave for ${config.currency} ${config.amount}...\nTx Ref: ${config.tx_ref}`);

                // Simulate success after a short delay
                setTimeout(() => {
                    window.location.href = config.redirect_url;
                }, 1500);
            } else {
                alert(res.error || "Payment failed to initialize");
            }
        } catch (err) {
            console.error(err);
        } finally {
            // setLoading(false); // Stay loading until redirect
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-[2.5rem] p-8 md:p-10 shadow-3xl relative overflow-hidden group"
        >
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/20 blur-[100px] animate-pulse" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-purple-500/10 blur-[120px]" />

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                <div className="w-24 h-24 rounded-[2rem] bg-white/10 flex items-center justify-center backdrop-blur-xl border border-white/20 shrink-0 shadow-2xl">
                    <Zap className="text-blue-400 animate-bounce" size={40} fill="currentColor" />
                </div>

                <div className="flex-1 space-y-4 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 px-4 py-1.5 rounded-full border border-blue-500/30">
                        <Sparkles size={14} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Priority Verification</span>
                    </div>

                    <h2 className="text-3xl font-black text-white tracking-tight leading-none italic">
                        The Trusted <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Bio Badge</span>
                    </h2>

                    <p className="text-slate-400 text-sm font-medium max-w-md">
                        Fast-track your certificate verification with our regional trust network. Verified candidates are 5x more likely to be discovered by premium employers.
                    </p>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 pt-2">
                        <div className="flex items-center gap-2 text-white">
                            <ShieldCheck size={18} className="text-blue-400" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Identity Audit</span>
                        </div>
                        <div className="flex items-center gap-2 text-white">
                            <CreditCard size={18} className="text-blue-400" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Secure Payment</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-8 rounded-[2rem] w-full md:w-auto text-center space-y-4 shadow-2xl">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">One-Time Fee</p>
                        <p className="text-4xl font-black text-white italic">$50.00</p>
                    </div>

                    <button
                        onClick={handleUpgrade}
                        disabled={loading}
                        className="w-full h-16 bg-white text-slate-900 rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-400 hover:text-white transition-all active:scale-95 shadow-xl shadow-blue-500/10"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : (
                            <>
                                Initialize Checkout
                                <ShieldCheck size={16} />
                            </>
                        )}
                    </button>

                    <p className="text-[9px] font-bold text-slate-500 max-w-[150px] mx-auto leading-tight">
                        Payments processed by <span className="text-slate-300">Flutterwave</span> Regional Gateway.
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
