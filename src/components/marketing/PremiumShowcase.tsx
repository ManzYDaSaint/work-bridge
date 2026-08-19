import React from "react";
import Link from "next/link";
import { MessageSquare, Zap, ShieldCheck, ArrowRight, CheckCircle2, Phone } from "lucide-react";

export default function PremiumShowcase() {
    return (
        <section className="px-4 sm:px-6 max-w-6xl mx-auto py-16">
            <div className="relative rounded-[2.5rem] bg-gradient-to-br from-emerald-900/90 via-slate-900 to-slate-950 dark:from-emerald-950 dark:via-slate-900 dark:to-slate-950 border border-emerald-500/30 dark:border-emerald-500/20 text-white p-8 sm:p-14 shadow-2xl overflow-hidden">
                {/* Ambient glow */}
                <div className="absolute -top-20 -left-20 w-96 h-96 bg-emerald-500/15 dark:bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-teal-500/15 dark:bg-teal-500/10 blur-[100px] rounded-full pointer-events-none" />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">

                    {/* Left Column: Value Proposition & Details */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 dark:bg-emerald-500/15 px-4 py-1.5 text-xs font-bold text-emerald-300 dark:text-emerald-400 border border-emerald-400/30 dark:border-emerald-500/30 backdrop-blur">
                            <MessageSquare size={14} className="text-emerald-400" />
                            <span>AGANYU PREMIUM — MWK 1,000 / MONTH</span>
                        </div>

                        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1]">
                            Instant Job Alerts Delivered Right to Your <span className="text-emerald-400 underline decoration-emerald-500/40 underline-offset-8">WhatsApp</span>
                        </h2>

                        <p className="text-base sm:text-lg text-slate-200 dark:text-slate-300 font-normal leading-relaxed">
                            Don&apos;t let your dream role pass by. Aganyu Premium evaluates your unique profile using AI matching and sends prioritized, high-score opportunity alerts directly to your phone.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div className="flex items-start gap-3 bg-white/10 dark:bg-white/5 border border-white/15 dark:border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                                <Zap size={20} className="text-emerald-400 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-bold text-white">Instant AI Matching</h4>
                                    <p className="text-xs text-slate-300 dark:text-slate-400 mt-0.5">Matched as soon as employers post relevant roles.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 bg-white/10 dark:bg-white/5 border border-white/15 dark:border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                                <ShieldCheck size={20} className="text-emerald-400 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-bold text-white">Verified Employers Only</h4>
                                    <p className="text-xs text-slate-300 dark:text-slate-400 mt-0.5">Scam-free, high-quality vacancy alerts.</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-5">
                            <Link
                                href="/dashboard/seeker/subscription"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-2xl bg-emerald-400 hover:bg-emerald-300 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-slate-950 px-6 sm:px-8 py-4 text-sm font-bold transition-all shadow-lg shadow-emerald-500/25 active:scale-95 group text-center"
                            >
                                Get Instant WhatsApp Alerts — MWK 1,000
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </Link>

                            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-slate-300 dark:text-slate-400 font-medium">
                                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                                <span>Airtel Money, TNM Mpamba, &amp; Cards</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Live Mock WhatsApp Match Card */}
                    <div className="lg:col-span-5">
                        <div className="relative mx-auto max-w-sm rounded-[2rem] bg-slate-900/90 dark:bg-slate-900 border-2 border-slate-700/80 p-5 shadow-2xl space-y-4">
                            {/* Phone Header simulation */}
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xs">
                                        <Phone size={14} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white">Aganyu Career Bot</p>
                                        <p className="text-[10px] text-emerald-400 font-medium">● Online • Instant Match Alert</p>
                                    </div>
                                </div>
                                <span className="text-[10px] text-slate-400">Just now</span>
                            </div>

                            {/* WhatsApp Message Bubble Simulation */}
                            <div className="rounded-2xl bg-emerald-950/80 dark:bg-emerald-950/60 border border-emerald-500/30 p-4 space-y-2.5 text-xs text-slate-200">
                                <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-400 border-b border-emerald-500/20 pb-1.5">
                                    <span>🎯 94% PERFECT MATCH</span>
                                    <span className="bg-emerald-500/20 px-2 py-0.5 rounded text-[10px]">PREMIUM</span>
                                </div>
                                <p className="font-bold text-white text-sm">Senior Frontend Developer</p>
                                <p className="text-slate-300 text-[11px]">📍 Lilongwe, Malawi • MWK 1,200,000 / mo</p>
                                <p className="text-slate-400 text-[11px] leading-relaxed">
                                    Your professional DNA aligns with this active vacancy.
                                </p>
                                <div className="pt-1.5 border-t border-emerald-500/20 flex items-center justify-between">
                                    <span className="text-[10px] text-slate-400">1-Tap Apply Available</span>
                                    <span className="text-[11px] font-bold text-emerald-400 underline">View Job Details &rarr;</span>
                                </div>
                            </div>

                            <div className="text-center pt-1">
                                <span className="text-[11px] text-slate-400 font-medium">
                                    💡 Delivered directly to your phone via WhatsApp
                                </span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}
