"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Search, Send, Briefcase, CheckCircle, FileText, Zap, MessageSquare } from "lucide-react";

const Tag = Search; // Using Search as a proxy for Tag/Match icon

const seekerSteps = [
    {
        title: "Create Profile",
        description: "Build a standout professional profile that highlights your skills and experience.",
        icon: UserPlus,
        color: "bg-blue-500",
    },
    {
        title: "AI Job Match",
        description: "Our algorithm finds roles that perfectly align with your career aspirations.",
        icon: Tag,
        color: "bg-indigo-500",
    },
    {
        title: "One-Click Apply",
        description: "Send your application directly to employers with a single tap.",
        icon: Send,
        color: "bg-sky-500",
    },
    {
        title: "Get Hired",
        description: "Chat directly with hiring managers and land your dream job.",
        icon: CheckCircle,
        color: "bg-emerald-500",
    },
];

const employerSteps = [
    {
        title: "Post a Role",
        description: "Create detailed job listings to attract the best talent in the industry.",
        icon: FileText,
        color: "bg-blue-600",
    },
    {
        title: "Smart Sourcing",
        description: "Access a curated pool of verified candidates matched to your requirements.",
        icon: Zap,
        color: "bg-indigo-600",
    },
    {
        title: "Direct Chat",
        description: "Connect instantly with top talent through our integrated messaging system.",
        icon: MessageSquare,
        color: "bg-sky-600",
    },
    {
        title: "Scale Your Team",
        description: "Hire with confidence and build the future of your company.",
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
