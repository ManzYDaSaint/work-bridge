"use client";

import { useState } from "react";
import PricingCard from "@/components/marketing/PricingCard";
import BackgroundMesh from "@/components/marketing/BackgroundMesh";
import { motion } from "framer-motion";

export default function PricingSection() {
    const [isYearly, setIsYearly] = useState(false);

    return (
        <section id="pricing" className="relative mt-20 pb-24 overflow-hidden border-t border-stone-200/80 dark:border-slate-800">
            <div className="absolute inset-0 pointer-events-none opacity-50">
                <BackgroundMesh />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-20">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black tracking-widest uppercase mb-6 backdrop-blur-sm">
                            Transparent Pricing
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight leading-[1.1] text-slate-900 dark:text-white">
                            Power up your <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600">career or team.</span>
                        </h2>
                        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-light mb-10">
                            Choose the plan that fits your current goals. No hidden fees, cancel any time.
                        </p>

                        {/* Billing Toggle */}
                        <div className="flex items-center justify-center gap-4 mb-8">
                            <span className={`text-sm font-bold ${!isYearly ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>Monthly</span>
                            <button
                                onClick={() => setIsYearly(!isYearly)}
                                className="relative w-16 h-8 rounded-full bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/20 p-1 transition-colors"
                                aria-label="Toggle yearly billing"
                            >
                                <motion.div
                                    animate={{ x: isYearly ? 32 : 0 }}
                                    className="w-6 h-6 rounded-full bg-blue-600 shadow-md"
                                />
                            </button>
                            <span className={`text-sm font-bold flex items-center gap-2 ${isYearly ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                                Yearly
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] uppercase tracking-wider">Save 20%</span>
                            </span>
                        </div>
                    </motion.div>
                </div>

                {/* Pricing Cards */}
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
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
                                "Structured Candidate Screening",
                                "Direct Candidate Messaging",
                                "Analytics Dashboard",
                                "Priority Support"
                            ]}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
