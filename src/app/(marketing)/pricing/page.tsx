"use client";

import { useState } from "react";
import PricingCard from "@/components/marketing/PricingCard";
import BackgroundMesh from "@/components/marketing/BackgroundMesh";
import LogoMarquee from "@/components/marketing/LogoMarquee";
import { motion } from "framer-motion";

export default function PricingPage() {
    const [isYearly, setIsYearly] = useState(false);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#020617]">
            {/* Hero Section */}
            <section className="relative pt-32 pb-24 overflow-hidden bg-[#020617]">
                <BackgroundMesh />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-3xl mx-auto"
                    >
                        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black tracking-widest uppercase mb-8 backdrop-blur-sm">
                            Transparent Pricing
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tight leading-[1.1] text-white">
                            Power up your <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-400">career or team.</span>
                        </h1>
                        <p className="text-xl text-slate-400 leading-relaxed font-light mb-12">
                            Choose the plan that fits your current goals. No hidden fees, cancel any time.
                        </p>

                        {/* Billing Toggle */}
                        <div className="flex items-center justify-center gap-4 mb-8">
                            <span className={`text-sm font-bold ${!isYearly ? 'text-white' : 'text-slate-500'}`}>Monthly</span>
                            <button
                                onClick={() => setIsYearly(!isYearly)}
                                className="relative w-16 h-8 rounded-full bg-white/10 border border-white/20 p-1 transition-colors"
                            >
                                <motion.div
                                    animate={{ x: isYearly ? 32 : 0 }}
                                    className="w-6 h-6 rounded-full bg-blue-500 shadow-md"
                                />
                            </button>
                            <span className={`text-sm font-bold flex items-center gap-2 ${isYearly ? 'text-white' : 'text-slate-500'}`}>
                                Yearly
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] uppercase tracking-wider">Save 20%</span>
                            </span>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="relative -mt-12 z-20 pb-32">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                        <PricingCard
                            title="Candidate"
                            price={isYearly ? "9,590 MWK" : "999 MWK"}
                            billingCycle={isYearly ? "yr" : "mo"}
                            features={[
                                "Unlimited Job Applications",
                                "Premium Profile Badges",
                                "Real-time SMS Alerts",
                                "Community Chat Access",
                                "Resource Library Access"
                            ]}
                        />
                        <PricingCard
                            title="Recruiter"
                            price={isYearly ? "95,990 MWK" : "9,999 MWK"}
                            billingCycle={isYearly ? "yr" : "mo"}
                            isPopular
                            features={[
                                "Verified Recruiter Badge",
                                "Unlimited Job Postings",
                                "AI Candidate Matching",
                                "Direct Candidate Messaging",
                                "Analytics Dashboard",
                                "Priority Support"
                            ]}
                        />
                    </div>
                </div>
            </section>

            {/* Bottom Trust Section */}
            <div className="bg-white dark:bg-slate-900/40 py-24 border-t border-slate-200 dark:border-slate-800/50">
                <div className="max-w-7xl mx-auto text-center">
                    <p className="text-slate-500 font-bold tracking-widest uppercase text-sm mb-12">Trusted by leading companies worldwide</p>
                    <LogoMarquee />
                </div>
            </div>
        </div>
    );
}
