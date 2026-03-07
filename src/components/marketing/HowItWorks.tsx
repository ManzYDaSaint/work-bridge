"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Search, Send, Briefcase, CheckCircle, FileText, Zap, MessageSquare, Shield } from "lucide-react";

const Tag = Search; // Using Search as a proxy for Tag/Match icon

const seekerSteps = [
    {
        title: "Create Profile",
        description: "Build a premium professional profile that showcases your unique value.",
        icon: UserPlus,
        color: "bg-blue-500",
    },
    {
        title: "Get Verified",
        description: "Upload certificates and earn the AI-Verified Bio Badge to boost trust.",
        icon: Shield,
        color: "bg-indigo-500",
    },
    {
        title: "Anonymized Match",
        description: "Get discovered by employers through secure, privacy-first AI summaries.",
        icon: Zap,
        color: "bg-sky-500",
    },
    {
        title: "Approve Reveal",
        description: "You controlled your PII. Only reveal your identity when the interest is mutual.",
        icon: CheckCircle,
        color: "bg-emerald-500",
    },
];

const employerSteps = [
    {
        title: "Define Goals",
        description: "Post job requirements focusing on intent and long-term project goals.",
        icon: FileText,
        color: "bg-blue-600",
    },
    {
        title: "Semantic Discovery",
        description: "Find verified talent matched by semantic alignment, not just keywords.",
        icon: Search,
        color: "bg-indigo-600",
    },
    {
        title: "Request Reveal",
        description: "Connect with anonymous candidates by requesting full profile access.",
        icon: MessageSquare,
        color: "bg-sky-600",
    },
    {
        title: "Secure Onboarding",
        description: "Hire with absolute confidence in verified skills and credentials.",
        icon: CheckCircle,
        color: "bg-emerald-600",
    },
];



export default function HowItWorks() {
    const [activeTab, setActiveTab] = useState<"seeker" | "employer">("seeker");
    const steps = activeTab === "seeker" ? seekerSteps : employerSteps;

    return (
        <section className="py-32 bg-white dark:bg-[#020617]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-20">
                    <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
                        How WorkBridge <br />
                        <span className="text-blue-600 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">really works.</span>
                    </h2>

                    <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl mb-12 border border-slate-200 dark:border-slate-800">
                        <button
                            onClick={() => setActiveTab("seeker")}
                            className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "seeker"
                                ? "bg-white dark:bg-slate-800 shadow-lg text-blue-600 dark:text-white"
                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                }`}
                        >
                            For Job Seekers
                        </button>
                        <button
                            onClick={() => setActiveTab("employer")}
                            className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "employer"
                                ? "bg-white dark:bg-slate-800 shadow-lg text-blue-600 dark:text-white"
                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                }`}
                        >
                            For Employers
                        </button>
                    </div>
                </div>

                <div className="relative">
                    {/* Connector Line */}
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 dark:bg-slate-800 hidden lg:block -translate-y-1/2 z-0" />

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 relative z-10">
                        <AnimatePresence mode="wait">
                            {steps.map((step, i) => (
                                <motion.div
                                    key={`${activeTab}-${i}`}
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                    transition={{ delay: i * 0.1, duration: 0.4 }}
                                    className="flex flex-col items-center text-center group"
                                >
                                    <div className={`w-20 h-20 ${step.color} rounded-3xl flex items-center justify-center text-white mb-8 shadow-2xl group-hover:scale-110 transition-transform duration-500 relative`}>
                                        <step.icon size={32} />
                                        <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-xs font-black">
                                            {i + 1}
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold mb-3 tracking-tight">{step.title}</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-[15px] leading-relaxed font-light px-4">
                                        {step.description}
                                    </p>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </section>
    );
}
