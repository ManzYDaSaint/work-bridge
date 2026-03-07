"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Briefcase, Users, Bell, Shield, ArrowRight, Sparkles, Zap, Target, BarChart3, Globe } from "lucide-react";
import FAQ from "@/components/marketing/FAQ";
import BackgroundMesh from "@/components/marketing/BackgroundMesh";
import LogoMarquee from "@/components/marketing/LogoMarquee";
import LiveActivity from "@/components/marketing/LiveActivity";
import HowItWorks from "@/components/marketing/HowItWorks";

const bentoFeatures = [
    {
        title: "Semantic Discovery",
        description: "Move beyond keywords. Our AI ranks talent based on the semantic intent and goals defined in your job requirements.",
        icon: Sparkles,
        className: "md:col-span-2 md:row-span-2 bg-blue-600 text-white",
        iconClassName: "bg-white/20 text-white",
    },
    {
        title: "Verified Trust",
        description: "Hire with confidence. Backgrounds and certifications are verified by AI for absolute accuracy.",
        icon: Shield,
        className: "md:col-span-1 md:row-span-1 bg-slate-900 text-white",
        iconClassName: "bg-blue-500/20 text-blue-400",
    },
    {
        title: "Privacy First",
        description: "Profiles are anonymized until you approve. Redact PII while highlighting professional impact.",
        icon: Users,
        className: "md:col-span-1 md:row-span-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-white",
        iconClassName: "bg-indigo-500/10 text-indigo-500",
    },
    {
        title: "Secure Verification",
        description: "Regional trust network and smart verification badges for elite talent recognition.",
        icon: Zap,
        className: "md:col-span-2 md:row-span-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800",
        iconClassName: "bg-blue-500/10 text-blue-600",
    },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1
    }
};

export default function LandingPage() {
    return (
        <div className="flex flex-col min-h-screen">
            {/* Hero Section */}
            <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#020617] pt-20">
                <BackgroundMesh />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-24 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium tracking-wide mb-10 backdrop-blur-md">
                            <Sparkles size={16} className="text-blue-400 animate-pulse" />
                            <span>The Next Generation of Hiring</span>
                        </div>

                        <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-white mb-10 leading-[0.9]">
                            Bridge the gap to <br />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-400">
                                your future.
                            </span>
                        </h1>

                        <p className="max-w-2xl mx-auto text-xl md:text-2xl text-slate-400 mb-14 leading-relaxed font-light">
                            WorkBridge establishes trust through AI-verified credentials and privacy-first matching. The most elite regional talent, discovered with purpose.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-20">
                            <Link href="/register" className="h-16 px-12 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xl font-bold shadow-[0_0_40px_rgba(37,99,235,0.4)] hover:shadow-[0_0_60px_rgba(37,99,235,0.6)] transition-all flex items-center gap-3 group">
                                Start Your Journey
                                <ArrowRight size={24} className="group-hover:translate-x-1.5 transition-transform" />
                            </Link>
                            <Link href="/register" className="h-16 px-12 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-xl font-bold border border-white/10 backdrop-blur-md transition-all">
                                Hire Talent
                            </Link>
                        </div>
                    </motion.div>
                </div>

                <div className="w-full relative z-10 mt-auto">
                    <LogoMarquee />
                </div>
            </section>


            {/* Features Section */}
            <section className="py-32 bg-slate-50 dark:bg-slate-900/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-24">
                        <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight text-slate-900 dark:text-white">
                            Everything you need to <br />
                            <span className="text-blue-600">hire or be hired.</span>
                        </h2>
                        <p className="text-xl text-slate-500 dark:text-slate-400 font-light">
                            From first application to final offer, WorkBridge powers every step with deep insights and human connection.
                        </p>
                    </div>

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-6 h-auto md:h-[600px]"
                    >
                        {bentoFeatures.map((feature, i) => (
                            <motion.div
                                key={i}
                                variants={itemVariants}
                                whileHover={{ scale: 0.98 }}
                                className={`group relative p-8 rounded-[2.5rem] overflow-hidden flex flex-col justify-end transition-all ${feature.className}`}
                            >
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${feature.iconClassName}`}>
                                    <feature.icon size={28} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold mb-3 tracking-tight">{feature.title}</h3>
                                    <p className="opacity-80 text-lg leading-relaxed font-light">{feature.description}</p>
                                </div>

                                {/* Subtle glow effect on hover */}
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gradient-to-br from-white/10 to-transparent" />
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            <HowItWorks />

            <LiveActivity />

            <FAQ />

            {/* CTA Section */}
            <section className="py-32 relative overflow-hidden bg-[#020617]">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #3b82f6 1px, transparent 0)', backgroundSize: '40px 40px' }} />

                <div className="max-w-5xl mx-auto px-4 relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="bg-blue-600 p-16 md:p-24 rounded-[3rem] text-center shadow-[0_0_100px_rgba(37,99,235,0.3)] relative overflow-hidden group"
                    >
                        {/* Interactive glow effect */}
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                        <h2 className="text-4xl md:text-7xl font-black text-white mb-8 tracking-tight">
                            Ready to bridge <br /> the gap?
                        </h2>
                        <p className="text-xl md:text-2xl text-blue-100 mb-12 opacity-90 max-w-2xl mx-auto font-light leading-relaxed">
                            Join thousands of elite candidates and world-class employers connecting with purpose on WorkBridge.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <Link href="/register" className="h-16 px-12 bg-white hover:bg-slate-100 text-blue-600 rounded-2xl text-xl font-black transition-all hover:scale-105 active:scale-95 shadow-xl">
                                Join Now — It's Free
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>
        </div>
    );
}
