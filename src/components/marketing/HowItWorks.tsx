"use client";

import { useState } from "react";
import { UserPlus, Search, CheckCircle, FileText, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const seekerSteps = [
    {
        title: "Build Your Profile",
        description: "Add your skills, experience, education, certifications, and portfolio links — your full professional presence in one place.",
        icon: UserPlus,
        color: "bg-[#16324f]",
    },
    {
        title: "Set Your Intent",
        description: "Tell employers exactly what you're looking for — a job, internship, attachment, or just open to offers.",
        icon: FileText,
        color: "bg-[#1a4f7a]",
    },
    {
        title: "Get Discovered",
        description: "Employers searching for your skills will find you instantly. Control your visibility — public, anonymous, or hidden.",
        icon: Sparkles,
        color: "bg-[#1e6ea5]",
    },
    {
        title: "Get Hired",
        description: "Receive direct invites from employers, track applications, and move through a structured hiring pipeline.",
        icon: CheckCircle,
        color: "bg-emerald-600",
    },
];

const employerSteps = [
    {
        title: "Post a Role",
        description: "Define clear requirements — must-have skills, experience level, screening questions, and work mode.",
        icon: FileText,
        color: "bg-[#16324f]",
    },
    {
        title: "Discover Talent",
        description: "Browse and filter a pool of verified job seekers, students, and interns actively looking for opportunities.",
        icon: Search,
        color: "bg-[#1a4f7a]",
    },
    {
        title: "Get Instant Matches",
        description: "Each job automatically surfaces candidates whose skills match your requirements — no manual searching needed.",
        icon: Sparkles,
        color: "bg-[#1e6ea5]",
    },
    {
        title: "Invite & Hire",
        description: "Save promising candidates, send direct invites, and move applicants through your pipeline to hire with confidence.",
        icon: CheckCircle,
        color: "bg-emerald-600",
    },
];

export default function HowItWorks() {
    const [activeTab, setActiveTab] = useState<"seeker" | "employer">("seeker");
    const steps = activeTab === "seeker" ? seekerSteps : employerSteps;

    return (
        <section className="py-24 bg-white dark:bg-slate-950">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <p className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 mb-4">
                        How it works
                    </p>
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Built for both sides of the table
                    </h2>
                    <p className="mt-4 text-base text-slate-500 dark:text-slate-400 leading-relaxed">
                        Whether you are looking for work or looking for talent — WorkBridge is designed to make the connection faster, smarter, and more human.
                    </p>
                </div>

                {/* Tab Toggle */}
                <div className="flex justify-center mb-12">
                    <div className="inline-flex p-1 bg-stone-100 dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-800">
                        <button
                            onClick={() => setActiveTab("seeker")}
                            className={`px-4 sm:px-6 py-2.5 rounded-xl text-sm font-semibold transition-all relative whitespace-nowrap ${activeTab === "seeker"
                                ? "text-white"
                                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                }`}
                        >
                            {activeTab === "seeker" && (
                                <motion.div
                                    layoutId="activeTabBg"
                                    className="absolute inset-0 bg-[#16324f] rounded-xl"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className="relative z-10 hidden sm:inline">For Job Seekers & Students</span>
                            <span className="relative z-10 sm:hidden">Job Seekers</span>
                        </button>
                        <button
                            onClick={() => setActiveTab("employer")}
                            className={`px-4 sm:px-6 py-2.5 rounded-xl text-sm font-semibold transition-all relative whitespace-nowrap ${activeTab === "employer"
                                ? "text-white"
                                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                }`}
                        >
                            {activeTab === "employer" && (
                                <motion.div
                                    layoutId="activeTabBg"
                                    className="absolute inset-0 bg-[#16324f] rounded-xl"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className="relative z-10 hidden sm:inline">For Employers</span>
                            <span className="relative z-10 sm:hidden">Employers</span>
                        </button>
                    </div>
                </div>

                {/* Steps Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <AnimatePresence mode="wait">
                        {steps.map((step, i) => {
                            const Icon = step.icon;
                            return (
                                <motion.div
                                    key={`${activeTab}-${i}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3, delay: i * 0.1 }}
                                    className="relative flex flex-col rounded-2xl border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
                                >
                                    <div className={`${step.color} mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl text-white`}>
                                        <Icon size={22} />
                                    </div>
                                    <span className="absolute right-5 top-5 text-3xl font-black text-stone-100 dark:text-slate-800">
                                        {i + 1}
                                    </span>
                                    <h3 className="mb-2 font-bold text-slate-900 dark:text-white">{step.title}</h3>
                                    <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{step.description}</p>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
}
