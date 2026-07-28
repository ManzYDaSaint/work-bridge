"use client";

import { useState } from "react";
import { motion, Variants } from "framer-motion";
import Link from "next/link";
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
    Mail,
    Award,
    Share2,
    CheckCircle2,
    HelpCircle,
    Clock,
    UserCheck,
    Send,
    Check,
} from "lucide-react";

const sectionVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut" },
    },
};

export function HeroSection() {
    return (
        <section className="px-4 sm:px-6 max-w-6xl mx-auto pt-20 sm:pt-28 pb-12">
            <motion.div
                initial="hidden"
                animate="visible"
                variants={sectionVariants}
                className="rounded-[2.5rem] border border-stone-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm px-6 sm:px-12 py-12 sm:py-16 shadow-[0_30px_100px_-40px_rgba(17,24,39,0.2)] relative overflow-hidden"
            >
                <div className="max-w-3xl space-y-6 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-wrap items-center gap-2"
                    >
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-400">
                            <Sparkles size={12} className="text-sky-500" />
                            Malawi&apos;s Talent &amp; Opportunity Network
                        </span>
                    </motion.div>

                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.05]">
                        Your career.<br />
                        <span className="text-[#16324f] dark:text-sky-400">Discovered.</span>{" "}
                        Not just applied&nbsp;for.
                    </h1>

                    <p className="max-w-xl text-lg sm:text-xl text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                        Malawi&apos;s modern marketplace for jobs, internships, scholarships, and grants. Build your profile and let top employers &amp; opportunities find you.
                    </p>

                    {/* Quick Value Badges */}
                    <div className="flex flex-wrap gap-2 pt-2">
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                            <Briefcase size={13} className="text-sky-500" /> Remote &amp; Local Jobs
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40">
                            <Award size={13} className="text-amber-500" /> Grants &amp; Scholarships
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40">
                            <Share2 size={13} className="text-emerald-500" /> Auto Social Reach
                        </span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-8 relative z-10">
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

                {/* Concierge Teaser */}
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium relative z-10">
                    <Mail size={14} className="text-sky-500" />
                    <span>Busy employer? Skip the setup — </span>
                    <a href="mailto:jobs@aganyu.com" className="font-bold text-[#16324f] dark:text-sky-400 underline hover:no-underline">
                        Email your vacancy to jobs@aganyu.com ✉️
                    </a>
                </div>

                <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-stone-200/70 pt-6 dark:border-slate-800 relative z-10">
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
    );
}

export function AudienceCards() {
    const [activeTab, setActiveTab] = useState<"seeker" | "employer">("seeker");

    return (
        <section className="px-4 sm:px-6 max-w-6xl mx-auto mb-20">
            {/* Tab Control */}
            <div className="flex justify-center mb-8">
                <div className="inline-flex p-1.5 rounded-2xl bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab("seeker")}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                            activeTab === "seeker"
                                ? "bg-white dark:bg-slate-900 text-[#16324f] dark:text-white shadow-md"
                                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        }`}
                    >
                        <GraduationCap size={18} /> For Job &amp; Opportunity Seekers
                    </button>
                    <button
                        onClick={() => setActiveTab("employer")}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                            activeTab === "employer"
                                ? "bg-white dark:bg-slate-900 text-[#16324f] dark:text-white shadow-md"
                                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        }`}
                    >
                        <Briefcase size={18} /> For Employers &amp; Recruiters
                    </button>
                </div>
            </div>

            {/* Persona Content Card */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="rounded-[2.5rem] border border-stone-200 bg-white p-8 sm:p-12 dark:border-slate-800 dark:bg-slate-900 shadow-xl"
            >
                {activeTab === "seeker" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="space-y-6">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#16324f] text-white shadow-lg">
                                <GraduationCap size={24} />
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Stop applying blindly. Let opportunities find you.
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                Build your professional DNA once. Get matched directly to jobs, internships, scholarships, and grants without filling endless forms.
                            </p>
                            <Link
                                href="/register?role=seeker"
                                className="inline-flex items-center gap-2 rounded-2xl bg-[#16324f] px-8 py-4 text-base font-bold text-white hover:opacity-90 shadow-md transition-all"
                            >
                                Create your free profile <ArrowRight size={18} />
                            </Link>
                        </div>
                        <div className="space-y-4 rounded-2xl bg-stone-50 dark:bg-slate-950/60 p-6 border border-stone-200/60 dark:border-slate-800">
                            {[
                                { title: "Direct Employer Invites", desc: "Employers discover your profile and send direct 'Invite to Apply' messages." },
                                { title: "Opportunities Hub Access", desc: "Browse verified scholarships, fellowships, and grants alongside traditional jobs." },
                                { title: "Privacy Controls", desc: "Choose Public, Anonymous (skills visible, identity hidden), or Hidden anytime." },
                                { title: "Profile Analytics", desc: "Track how many employers viewed your profile each week." },
                            ].map((item) => (
                                <div key={item.title} className="flex items-start gap-3">
                                    <CheckCircle2 size={18} className="text-sky-500 flex-shrink-0 mt-1" />
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="space-y-6">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-slate-700 shadow-lg">
                                <Briefcase size={24} />
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Hire faster with Smart Match &amp; Auto Social Reach.
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                Post structured jobs or let our white-glove service handle it. Every post is automatically broadcast to LinkedIn and Facebook Pages.
                            </p>
                            <div className="flex flex-wrap items-center gap-4">
                                <Link
                                    href="/register?role=employer"
                                    className="inline-flex items-center gap-2 rounded-2xl bg-[#16324f] px-8 py-4 text-base font-bold text-white hover:opacity-90 shadow-md transition-all"
                                >
                                    Start hiring <ArrowRight size={18} />
                                </Link>
                                <a
                                    href="mailto:jobs@aganyu.com"
                                    className="inline-flex items-center gap-2 rounded-2xl border-2 border-stone-200 dark:border-slate-700 px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800 transition-all"
                                >
                                    <Mail size={16} /> Email vacancy (White-Glove)
                                </a>
                            </div>
                        </div>
                        <div className="space-y-4 rounded-2xl bg-stone-50 dark:bg-slate-950/60 p-6 border border-stone-200/60 dark:border-slate-800">
                            {[
                                { title: "Instant 'Perfect Fit' Matching", desc: "View qualified candidates instantly upon posting using semantic skill analysis." },
                                { title: "Automated Social Amplification", desc: "Every job post automatically reaches thousands across LinkedIn & Facebook." },
                                { title: "Direct Candidate Contact", desc: "Send 'Invite to Apply' directly in-platform without expensive cold calls." },
                                { title: "Saved Talent Pools", desc: "Bookmark candidate profiles for future hiring needs." },
                            ].map((item) => (
                                <div key={item.title} className="flex items-start gap-3">
                                    <CheckCircle2 size={18} className="text-sky-500 flex-shrink-0 mt-1" />
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                            {item.title}
                                            {item.title.includes("Perfect Fit") && (
                                                <span className="group relative inline-flex items-center text-slate-400 hover:text-sky-500 cursor-help">
                                                    <HelpCircle size={14} />
                                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl z-20 font-normal">
                                                        Semantic skill parsing matches candidate capability, not just exact keyword strings.
                                                    </span>
                                                </span>
                                            )}
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </motion.div>
        </section>
    );
}

export function PlatformHighlights() {
    return (
        <section className="px-4 sm:px-6 max-w-6xl mx-auto mb-16">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="rounded-[2rem] bg-[#16324f] px-8 py-8 dark:bg-slate-900 dark:border dark:border-slate-800 shadow-2xl shadow-sky-950/40"
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    {[
                        { label: "Avg. Time to First Match", value: "< 48 Hours", icon: Clock },
                        { label: "Opportunities Tracked", value: "Jobs & Grants", icon: Award },
                        { label: "Social Amplification", value: "Auto-Distributed", icon: Share2 },
                        { label: "Cost to Join", value: "100% Free", icon: Zap },
                    ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="space-y-1">
                            <div className="inline-flex items-center justify-center gap-1.5 text-[#16324f] dark:text-sky-400 mb-1">
                                <Icon size={16} className="text-sky-400" />
                                <span className="text-xl font-bold text-white tracking-tight">{value}</span>
                            </div>
                            <p className="text-xs font-black text-sky-300/70 uppercase tracking-[0.18em]">{label}</p>
                        </div>
                    ))}
                </div>
            </motion.div>
        </section>
    );
}

{/* Redesigned Student & Fresh Graduates Showcase */}
export function StudentCallout() {
    return (
        <section className="px-4 sm:px-6 max-w-6xl mx-auto py-12">
            <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={sectionVariants}
                className="relative rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-[#16324f] to-indigo-950 text-white p-8 sm:p-14 shadow-2xl border border-indigo-500/20 overflow-hidden"
            >
                {/* Background Glow Effect */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                    <div className="lg:col-span-7 space-y-6">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-sky-300 backdrop-blur border border-white/10">
                            <GraduationCap size={16} className="text-sky-400" />
                            Students &amp; Fresh Graduates Program
                        </span>
                        
                        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.15]">
                            Your degree deserves more than <br className="hidden sm:inline" />
                            <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-amber-300 bg-clip-text text-transparent">
                                unanswered emails.
                            </span>
                        </h2>

                        <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed">
                            Skip entry-level application blackholes. Toggle your profile status to <strong className="text-sky-300 font-bold">&ldquo;Seeking Internship&rdquo;</strong> to be showcased directly to employers actively seeking emerging talent.
                        </p>

                        {/* Feature Badges */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                            <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 space-y-1 backdrop-blur-sm">
                                <UserCheck size={18} className="text-sky-400" />
                                <h4 className="text-xs font-bold text-white">Direct Visibility</h4>
                                <p className="text-[11px] text-slate-400">Recruiters discover your skills directly.</p>
                            </div>
                            <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 space-y-1 backdrop-blur-sm">
                                <Award size={18} className="text-amber-400" />
                                <h4 className="text-xs font-bold text-white">Graduate Grants</h4>
                                <p className="text-[11px] text-slate-400">Access training &amp; fellowship funding.</p>
                            </div>
                            <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 space-y-1 backdrop-blur-sm">
                                <Zap size={18} className="text-emerald-400" />
                                <h4 className="text-xs font-bold text-white">No-Friction Entry</h4>
                                <p className="text-[11px] text-slate-400">One profile matches all roles.</p>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Link
                                href="/register?role=seeker"
                                className="inline-flex items-center gap-2.5 rounded-2xl bg-white text-slate-900 hover:bg-sky-50 px-8 py-4 text-base font-bold transition-all shadow-lg active:scale-95 group"
                            >
                                <GraduationCap size={20} className="text-[#16324f]" />
                                Join as a Student / Graduate
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>

                    {/* Interactive Visual Graphic */}
                    <div className="lg:col-span-5 hidden lg:block">
                        <div className="relative rounded-3xl bg-slate-950/60 border border-white/10 p-6 space-y-4 backdrop-blur-md shadow-2xl">
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                                </div>
                                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Live Graduate Match</span>
                            </div>

                            <div className="space-y-3 text-xs">
                                <div className="rounded-2xl bg-white/5 p-3 flex items-center justify-between border border-white/5">
                                    <div>
                                        <p className="font-bold text-white">Computer Science Graduate</p>
                                        <p className="text-[10px] text-slate-400">Matched to 3 Junior Developer &amp; Tech Fellowships</p>
                                    </div>
                                    <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold">
                                        98% Match
                                    </span>
                                </div>

                                <div className="rounded-2xl bg-white/5 p-3 flex items-center justify-between border border-white/5">
                                    <div>
                                        <p className="font-bold text-white">Business &amp; Finance Intern</p>
                                        <p className="text-[10px] text-slate-400">Invited by 2 Corporate Employers</p>
                                    </div>
                                    <span className="rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 text-[10px] font-bold">
                                        Invite Sent
                                    </span>
                                </div>

                                <div className="rounded-2xl bg-white/5 p-3 flex items-center justify-between border border-white/5">
                                    <div>
                                        <p className="font-bold text-white">Global Fellowship Scholar</p>
                                        <p className="text-[10px] text-slate-400">Fully Funded Fellowship Grant</p>
                                    </div>
                                    <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold">
                                        Verified
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </section>
    );
}

{/* Redesigned Dual-Card Final CTA Hub */}
export function FinalCTA() {
    return (
        <section className="px-4 sm:px-6 max-w-6xl mx-auto py-16">
            <div className="text-center space-y-4 mb-12">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300 shadow-sm">
                    <Sparkles size={14} className="text-amber-500" />
                    Start Discovering Today
                </span>
                <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    Ready to accelerate your career or team?
                </h2>
                <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto font-normal">
                    Join Malawi's modern talent &amp; opportunity network for free. No credit card required.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Seeker Card */}
                <motion.div
                    initial={{ opacity: 0, x: -15 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="rounded-[2.5rem] border border-stone-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-10 shadow-xl hover:shadow-2xl transition-all flex flex-col justify-between space-y-8"
                >
                    <div className="space-y-6">
                        <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-200/60 dark:border-sky-900/40">
                            <GraduationCap size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">For Job &amp; Opportunity Seekers</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Build your profile once and let verified roles &amp; grants find you.</p>
                        </div>
                        <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                            <li className="flex items-center gap-2">
                                <Check size={16} className="text-emerald-500 shrink-0" />
                                <span>Get matched to local &amp; remote jobs</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Check size={16} className="text-emerald-500 shrink-0" />
                                <span>Access verified scholarships &amp; grants</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Check size={16} className="text-emerald-500 shrink-0" />
                                <span>Complete privacy control (Public or Anonymous)</span>
                            </li>
                        </ul>
                    </div>
                    <Link
                        href="/register?role=seeker"
                        className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#16324f] px-6 py-4 text-sm font-bold text-white hover:opacity-90 transition-all shadow-md"
                    >
                        Create Free Seeker Account <ArrowRight size={16} />
                    </Link>
                </motion.div>

                {/* Employer Card */}
                <motion.div
                    initial={{ opacity: 0, x: 15 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="rounded-[2.5rem] border border-stone-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-10 shadow-xl hover:shadow-2xl transition-all flex flex-col justify-between space-y-8"
                >
                    <div className="space-y-6">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-900/40">
                            <Building2 size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">For Employers &amp; Recruiters</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Post vacancies or let our white-glove team handle recruitment.</p>
                        </div>
                        <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                            <li className="flex items-center gap-2">
                                <Check size={16} className="text-emerald-500 shrink-0" />
                                <span>Semantic skill matching with Instant Top Fit</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Check size={16} className="text-emerald-500 shrink-0" />
                                <span>Automatic job broadcast to LinkedIn &amp; Facebook</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Check size={16} className="text-emerald-500 shrink-0" />
                                <span>Direct &ldquo;Invite to Apply&rdquo; messaging</span>
                            </li>
                        </ul>
                    </div>
                    <Link
                        href="/register?role=employer"
                        className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-4 text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-md"
                    >
                        Start Hiring Talent <ArrowRight size={16} />
                    </Link>
                </motion.div>
            </div>
        </section>
    );
}
