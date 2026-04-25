"use client";

import Link from "next/link";
import PricingSection from "@/components/marketing/PricingSection";
import LogoMarquee from "@/components/marketing/LogoMarquee";
import HowItWorks from "@/components/marketing/HowItWorks";
import Features from "@/components/marketing/Features";
import FAQ from "@/components/marketing/FAQ";
import { motion, Variants } from "framer-motion";
import {
    GraduationCap,
    Briefcase,
    Sparkles,
    ArrowRight,
    Users,
    Building2,
    Search,
    MapPin,
    Zap,
    Shield,
} from "lucide-react";

const sectionVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: "easeOut" }
    }
};

export default function LandingPage() {
    return (
        <div className="pb-20 overflow-x-hidden">
            {/* ─── HERO ─────────────────────────────────────────────────── */}
            <section className="px-4 sm:px-6 max-w-6xl mx-auto pt-20 sm:pt-28 pb-16">
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={sectionVariants}
                    className="rounded-[2.5rem] border border-stone-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm px-6 sm:px-12 py-12 sm:py-20 shadow-[0_30px_100px_-40px_rgba(17,24,39,0.2)]"
                >
                    <div className="max-w-3xl space-y-6">
                        <motion.p
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-400"
                        >
                            <Sparkles size={12} className="text-sky-500" />
                            Malawi's Talent Marketplace
                        </motion.p>

                        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.05]">
                            Your career.<br />
                            <span className="text-[#16324f] dark:text-sky-400">Discovered.</span>{" "}
                            Not just applied&nbsp;for.
                        </h1>

                        <p className="max-w-xl text-lg sm:text-xl text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                            Build your professional profile, get discovered by employers searching for your exact skills, and receive direct invites — before you even apply.
                        </p>
                    </div>

                    {/* CTAs — clear visual hierarchy */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-10">
                        <Link
                            href="/register?role=seeker"
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#16324f] px-8 py-4 text-base font-bold text-white hover:opacity-90 shadow-lg shadow-sky-950/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <GraduationCap size={20} />
                            Create a free profile
                        </Link>
                        <Link
                            href="/register?role=employer"
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-stone-200 bg-white px-8 py-4 text-base font-bold text-slate-800 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 transition-all hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <Building2 size={20} />
                            Hire talent
                        </Link>
                        <Link
                            href="/jobs"
                            className="inline-flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-[#16324f] dark:text-slate-400 dark:hover:text-sky-400 transition-colors px-4 py-2"
                        >
                            <Search size={16} />
                            Browse jobs
                        </Link>
                    </div>

                    {/* Trust signals */}
                    <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-stone-200/70 pt-8 dark:border-slate-800">
                        {[
                            { icon: MapPin, text: "Malawi-first" },
                            { icon: Shield, text: "Privacy built-in" },
                            { icon: Zap, text: "Skill-based matching" },
                            { icon: Users, text: "Free to join" },
                        ].map(({ icon: Icon, text }) => (
                            <span key={text} className="flex items-center gap-2 text-sm font-semibold text-slate-400 dark:text-slate-500">
                                <Icon size={14} className="text-sky-500/50" />
                                {text}
                            </span>
                        ))}
                    </div>
                </motion.div>
            </section>

            {/* ─── DUAL AUDIENCE VALUE CARDS ──────────────────────────── */}
            <section className="px-4 sm:px-6 max-w-6xl mx-auto mb-24">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Seeker card */}
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={sectionVariants}
                        className="group rounded-[2.5rem] border border-stone-200 bg-white p-8 sm:p-10 dark:border-slate-800 dark:bg-slate-900 hover:shadow-2xl transition-all duration-500"
                    >
                        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#16324f] text-white shadow-lg shadow-sky-950/20">
                            <GraduationCap size={28} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                            For Job Seekers & Students
                        </h2>
                        <p className="text-sm font-bold text-sky-600 dark:text-sky-400 mb-6 uppercase tracking-wider">
                            Graduates · Students · Internship seekers
                        </p>
                        <ul className="space-y-4 text-base text-slate-600 dark:text-slate-300 mb-10">
                            {[
                                "Get discovered by employers searching for your exact skills",
                                "Set your intent — job, internship, or open to offers",
                                "Receive direct 'Invite to Apply' messages from employers",
                                "Track how many times employers view your profile",
                                "Control your privacy — Public, Anonymous, or Hidden",
                            ].map((item) => (
                                <li key={item} className="flex items-start gap-3">
                                    <div className="mt-1.5 flex-shrink-0 h-2 w-2 rounded-full bg-sky-500" />
                                    <span className="leading-tight">{item}</span>
                                </li>
                            ))}
                        </ul>
                        <Link
                            href="/register?role=seeker"
                            className="inline-flex items-center gap-2 rounded-2xl bg-[#16324f] px-6 py-3.5 text-base font-bold text-white hover:opacity-90 shadow-md transition-all group-hover:gap-3"
                        >
                            Create your profile <ArrowRight size={18} />
                        </Link>
                    </motion.div>

                    {/* Employer card */}
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={sectionVariants}
                        className="group rounded-[2.5rem] border border-stone-200 bg-white p-8 sm:p-10 dark:border-slate-800 dark:bg-slate-900 hover:shadow-2xl transition-all duration-500"
                    >
                        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-slate-700 shadow-lg">
                            <Briefcase size={28} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                            For Employers & Recruiters
                        </h2>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-6 uppercase tracking-wider">
                            Companies · Startups · Hiring managers
                        </p>
                        <ul className="space-y-4 text-base text-slate-600 dark:text-slate-300 mb-10">
                            {[
                                "Post structured jobs with must-have skills & screening",
                                "Discover talent — filter by skill, seniority, and intent",
                                "See instant suggested candidates when you post a role",
                                "Save candidates to a private talent pool for later",
                                "Send direct 'Invite to Apply' messages — no cold contact",
                            ].map((item) => (
                                <li key={item} className="flex items-start gap-3">
                                    <div className="mt-1.5 flex-shrink-0 h-2 w-2 rounded-full bg-slate-400" />
                                    <span className="leading-tight">{item}</span>
                                </li>
                            ))}
                        </ul>
                        <Link
                            href="/register?role=employer"
                            className="inline-flex items-center gap-2 rounded-2xl border-2 border-stone-200 bg-stone-50 px-6 py-3.5 text-base font-bold text-slate-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 transition-all group-hover:gap-3"
                        >
                            Start hiring <ArrowRight size={18} />
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* ─── PLATFORM HIGHLIGHTS BAR ─────────────────────────────── */}
            <section className="px-4 sm:px-6 max-w-6xl mx-auto mb-12">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="rounded-[2rem] bg-[#16324f] px-8 py-10 dark:bg-slate-900 dark:border dark:border-slate-800 shadow-2xl shadow-sky-950/40"
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 text-center sm:text-left md:text-center">
                        {[
                            { label: "Work Modes", value: "Remote · Hybrid · On-site" },
                            { label: "Visibility Options", value: "Public · Anonymous · Hidden" },
                            { label: "Matching", value: "Skill-based & instant" },
                            { label: "Cost to join", value: "Free forever" },
                        ].map(({ label, value }) => (
                            <div key={label} className="space-y-2">
                                <p className="text-lg font-bold text-white tracking-tight">{value}</p>
                                <p className="text-xs font-black text-sky-400/60 uppercase tracking-[0.2em]">{label}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </section>

            {/* ─── HOW IT WORKS ────────────────────────────────────────── */}
            <HowItWorks />

            {/* ─── FEATURES GRID ───────────────────────────────────────── */}
            <Features />

            {/* ─── STUDENT CALLOUT ─────────────────────────────────────── */}
            <section className="px-4 sm:px-6 max-w-6xl mx-auto py-12">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={sectionVariants}
                    className="rounded-[2.5rem] bg-stone-50 border border-stone-200 dark:bg-slate-900/60 dark:border-slate-800 overflow-hidden"
                >
                    <div className="px-6 sm:px-12 py-12 sm:py-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
                        <div className="max-w-xl">
                            <p className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-stone-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 mb-6">
                                <GraduationCap size={14} className="text-sky-500" />
                                Students & fresh graduates
                            </p>
                            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-5 leading-tight">
                                Your degree deserves more than unanswered applications.
                            </h2>
                            <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                                Set your profile to <span className="text-[#16324f] dark:text-sky-400 font-bold">"Seeking Internship"</span> and appear instantly in front of employers actively looking for fresh talent.
                            </p>
                        </div>
                        <div className="flex-shrink-0 w-full md:w-auto">
                            <Link
                                href="/register?role=seeker"
                                className="inline-flex w-full md:w-auto items-center justify-center gap-3 rounded-2xl bg-[#16324f] px-8 py-5 text-lg font-bold text-white hover:opacity-90 shadow-xl shadow-sky-950/20 transition-all hover:-translate-y-1"
                            >
                                <GraduationCap size={24} />
                                Join as a student
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* ─── FAQ ─────────────────────────────────────────────────── */}
            <FAQ />

            {/* ─── PRICING ─────────────────────────────────────────────── */}
            <PricingSection />

            {/* ─── FINAL CTA ───────────────────────────────────────────── */}
            <section className="px-4 sm:px-6 max-w-6xl mx-auto py-20">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="rounded-[3rem] border border-stone-200 bg-white px-6 sm:px-12 py-16 sm:py-24 text-center dark:border-slate-800 dark:bg-slate-900 shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-sky-50/50 to-transparent dark:from-sky-950/20 pointer-events-none" />

                    <div className="relative z-10 max-w-3xl mx-auto">
                        <p className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-stone-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 mb-8">
                            <Sparkles size={14} className="text-amber-500" />
                            Get started today
                        </p>
                        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
                            Ready to be discovered — or start discovering?
                        </h2>
                        <p className="text-lg text-slate-500 dark:text-slate-400 mb-12 max-w-md mx-auto font-medium">
                            Join the WorkBridge marketplace for free. No credit card required.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                href="/register?role=seeker"
                                className="inline-flex w-full sm:w-auto items-center justify-center gap-3 rounded-2xl bg-[#16324f] px-10 py-5 text-lg font-bold text-white hover:opacity-90 shadow-xl shadow-sky-950/20 transition-all hover:-translate-y-1"
                            >
                                <GraduationCap size={24} />
                                I am a job seeker
                            </Link>
                            <Link
                                href="/register?role=employer"
                                className="inline-flex w-full sm:w-auto items-center justify-center gap-3 rounded-2xl border-2 border-stone-200 bg-white px-10 py-5 text-lg font-bold text-slate-800 hover:opacity-90 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 transition-all hover:-translate-y-1"
                            >
                                <Building2 size={24} />
                                I am an employer
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* ─── TRUST / LOGOS ───────────────────────────────────────── */}
            <div className="max-w-7xl mx-auto text-center pb-24 px-4">
                <p className="text-slate-400 font-black tracking-[0.3em] uppercase text-[10px] mb-10 dark:text-slate-600">
                    Companies hiring on WorkBridge
                </p>
                <LogoMarquee />
            </div>

        </div>
    );
}
