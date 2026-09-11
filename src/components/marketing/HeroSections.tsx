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
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-400">
                            <Sparkles size={12} className="text-sky-500" />
                            Malawi&apos;s Talent &amp; Opportunity Network
                        </span>
                    </motion.div>

                    {/* Headline */}
                    <h1 className="text-3xl xs:text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight sm:leading-[1.05]">
                        Your career.<br />
                        <span className="text-[#16324f] dark:text-sky-400">Discovered.</span>{" "}
                        Not just applied&nbsp;for.
                    </h1>

                    {/* Subtext */}
                    <p className="max-w-xl text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                        Malawi&apos;s modern marketplace for jobs, internships, scholarships, and grants.
                        Build your profile once — let the right opportunities find you.
                    </p>

                    {/* Quick-access filter pills — touch-optimised, horizontally scrollable */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory pt-1">
                        <Link
                            href="/jobs?workMode=REMOTE"
                            className="snap-start shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60 hover:bg-sky-100 active:scale-95 transition-all"
                        >
                            ⚡ Remote Roles
                        </Link>
                        <Link
                            href="/jobs?query=Lilongwe"
                            className="snap-start shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200/80 active:scale-95 transition-all"
                        >
                            📍 Lilongwe
                        </Link>
                        <Link
                            href="/jobs?query=Blantyre"
                            className="snap-start shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200/80 active:scale-95 transition-all"
                        >
                            📍 Blantyre
                        </Link>
                        <Link
                            href="/opportunities"
                            className="snap-start shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 hover:bg-amber-100 active:scale-95 transition-all"
                        >
                            🎓 Grants &amp; Fellowships
                        </Link>
                    </div>
                </div>

                {/* CTAs — side by side on sm+ screens, stacked top-bottom on smaller screens */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-8 relative z-10">
                    <Link
                        href="/register?role=seeker"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#16324f] px-8 py-4 text-base font-bold text-white hover:opacity-90 shadow-lg shadow-sky-950/20 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                    >
                        <GraduationCap size={20} />
                        Create a free profile
                    </Link>
                    <Link
                        href="/register?role=employer"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-stone-200 bg-white px-7 py-4 text-sm font-bold text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                    >
                        <Building2 size={18} />
                        Hiring? Post a job
                    </Link>
                </div>

                {/* Minimal trust strip */}
                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2.5 border-t border-stone-200/70 pt-6 dark:border-slate-800 relative z-10">
                    {[
                        { icon: MapPin, text: "Malawi-first" },
                        { icon: Shield, text: "Privacy built-in" },
                        { icon: Zap, text: "Skill-based matching" },
                        { icon: Users, text: "Free forever" },
                    ].map(({ icon: Icon, text }) => (
                        <span key={text} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500">
                            <Icon size={13} className="text-sky-500/60" />
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
            {/* Tab Control — responsive labels so it never overflows on xs screens */}
            <div className="flex justify-center mb-8">
                <div className="inline-flex p-1.5 rounded-2xl bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab("seeker")}
                        className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                            activeTab === "seeker"
                                ? "bg-white dark:bg-slate-900 text-[#16324f] dark:text-white shadow-md"
                                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        }`}
                    >
                        <GraduationCap size={16} />
                        <span className="hidden sm:inline">For Job Seekers</span>
                        <span className="sm:hidden">Seekers</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("employer")}
                        className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                            activeTab === "employer"
                                ? "bg-white dark:bg-slate-900 text-[#16324f] dark:text-white shadow-md"
                                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        }`}
                    >
                        <Briefcase size={16} />
                        <span className="hidden sm:inline">For Employers</span>
                        <span className="sm:hidden">Employers</span>
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
    const stats = [
        {
            label: "Avg. Time to Match",
            value: "< 48 Hours",
            sub: "From profile creation to match",
            icon: Clock,
            accent: "from-sky-500/20 to-sky-500/5",
            border: "border-sky-500/20",
            iconColor: "text-sky-400",
        },
        {
            label: "Opportunities",
            value: "Jobs & Grants",
            sub: "Unified opportunity hub",
            icon: Award,
            accent: "from-amber-500/20 to-amber-500/5",
            border: "border-amber-500/20",
            iconColor: "text-amber-400",
        },
        {
            label: "Social Reach",
            value: "Auto-Distributed",
            sub: "LinkedIn & Facebook networks",
            icon: Share2,
            accent: "from-emerald-500/20 to-emerald-500/5",
            border: "border-emerald-500/20",
            iconColor: "text-emerald-400",
        },
        {
            label: "Pricing",
            value: "100% Free",
            sub: "No credit card required",
            icon: Zap,
            accent: "from-violet-500/20 to-violet-500/5",
            border: "border-violet-500/20",
            iconColor: "text-violet-400",
        },
    ];

    return (
        <section className="px-4 sm:px-6 max-w-6xl mx-auto mb-12">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="relative rounded-[2rem] overflow-hidden bg-slate-900/90 dark:bg-slate-900/80 border border-slate-800/80 shadow-xl shadow-slate-950/30 backdrop-blur-md"
            >
                {/* Subtle background gradient glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#16324f]/40 via-transparent to-indigo-950/30 pointer-events-none" />

                {/* Mobile: horizontal snap scroll. md+: 4-column grid */}
                <div className="relative z-10 flex overflow-x-auto md:grid md:grid-cols-4 scrollbar-none snap-x snap-mandatory md:snap-none md:divide-x md:divide-slate-800/60">
                    {stats.map(({ label, value, sub, icon: Icon, accent, border, iconColor }, i) => (
                        <div
                            key={label}
                            className={`snap-start shrink-0 min-w-[200px] md:min-w-0 flex flex-col items-center text-center gap-2.5 px-5 py-6 sm:py-7 ${i > 0 ? "border-l border-slate-800/60 md:border-l-0" : ""}`}
                        >
                            {/* Icon badge */}
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent} border ${border} flex items-center justify-center shrink-0 shadow-sm`}>
                                <Icon size={18} className={iconColor} />
                            </div>

                            {/* Refined Typography Stack */}
                            <div className="space-y-1">
                                <p className="text-base sm:text-lg font-bold text-white tracking-tight">
                                    {value}
                                </p>
                                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                                    {label}
                                </p>
                                <p className="text-[11px] text-slate-400/80 font-normal">
                                    {sub}
                                </p>
                            </div>
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
                        
                        <h2 className="text-2xl xs:text-3xl sm:text-5xl font-bold tracking-tight text-white leading-snug sm:leading-[1.15]">
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

export function FinalCTA() {
    return (
        <section className="px-4 sm:px-6 max-w-6xl mx-auto py-20">
            <div className="relative rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-[#16324f] to-indigo-950 text-white p-8 sm:p-12 md:p-16 shadow-2xl border border-indigo-500/20 overflow-hidden">
                {/* Background Accent Glows */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

                <div className="relative z-10 space-y-12">
                    {/* Header */}
                    <div className="text-center space-y-4 max-w-2xl mx-auto">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-sky-300 backdrop-blur border border-white/10">
                            <Sparkles size={14} className="text-amber-400" />
                            Empowering Malawi&apos;s Talent Pool
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                            Accelerate your career or simplify hiring.
                        </h2>
                        <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
                            Join Malawi&apos;s modern talent network today. Free forever for job seekers, powerful for employers.
                        </p>
                    </div>

                    {/* Dual Cards Showcase */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                        {/* Card 1: Job Seekers & Graduates */}
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4 }}
                            className="rounded-[2rem] bg-white/5 border border-white/10 p-8 sm:p-10 backdrop-blur-md flex flex-col justify-between space-y-8 hover:bg-white/[0.08] hover:border-white/20 transition-all shadow-xl group"
                        >
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="w-14 h-14 rounded-2xl bg-sky-500/20 text-sky-300 flex items-center justify-center border border-sky-400/30 shrink-0">
                                        <GraduationCap size={28} />
                                    </div>
                                    <span className="rounded-full bg-sky-400/10 text-sky-300 border border-sky-400/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider">
                                        🎓 Students &amp; Seekers
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-white tracking-tight">
                                        Your degree deserves direct visibility.
                                    </h3>
                                    <p className="text-sm text-slate-300 leading-relaxed font-normal">
                                        Skip entry-level application blackholes. Toggle status to <strong className="text-sky-300 font-semibold">&ldquo;Seeking Internship&rdquo;</strong> to be showcased directly to hiring employers.
                                    </p>
                                </div>

                                <ul className="space-y-3 text-xs text-slate-200 font-medium border-t border-white/10 pt-6">
                                    <li className="flex items-center gap-3">
                                        <Check size={18} className="text-emerald-400 shrink-0" />
                                        <span>Direct employer &ldquo;Invite to Apply&rdquo; messages</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check size={18} className="text-emerald-400 shrink-0" />
                                        <span>Access verified scholarships, internships &amp; grants</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check size={18} className="text-emerald-400 shrink-0" />
                                        <span>Complete privacy controls (Public or Anonymous)</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="pt-4">
                                <Link
                                    href="/register?role=seeker"
                                    className="w-full inline-flex items-center justify-center gap-2.5 rounded-2xl bg-white text-slate-900 hover:bg-sky-50 px-6 py-4 text-sm font-bold transition-all shadow-lg active:scale-98"
                                >
                                    Create Free Seeker Account
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </motion.div>

                        {/* Card 2: Employers & Concierge Hiring */}
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                            className="rounded-[2rem] bg-white/5 border border-white/10 p-8 sm:p-10 backdrop-blur-md flex flex-col justify-between space-y-8 hover:bg-white/[0.08] hover:border-white/20 transition-all shadow-xl group"
                        >
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-400/30 shrink-0">
                                        <Briefcase size={28} />
                                    </div>
                                    <span className="rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider">
                                        💼 Employers &amp; Hiring
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-white tracking-tight">
                                        Smart Matching or White-Glove Service.
                                    </h3>
                                    <p className="text-sm text-slate-300 leading-relaxed font-normal">
                                        Post vacancies directly or email your job description to <strong className="text-amber-300 font-semibold underline">jobs@aganyu.com</strong> — we broadcast to social media and send shortlists.
                                    </p>
                                </div>

                                <ul className="space-y-3 text-xs text-slate-200 font-medium border-t border-white/10 pt-6">
                                    <li className="flex items-center gap-3">
                                        <Check size={18} className="text-emerald-400 shrink-0" />
                                        <span>Semantic skill matching with Instant Fit scoring</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check size={18} className="text-emerald-400 shrink-0" />
                                        <span>Auto broadcast to LinkedIn &amp; Facebook Pages</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check size={18} className="text-emerald-400 shrink-0" />
                                        <span>White-glove concierge posting with 24-hr turnaround</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
                                <Link
                                    href="/register?role=employer"
                                    className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-400 text-slate-950 hover:bg-sky-300 px-6 py-4 text-sm font-bold transition-all shadow-lg active:scale-98"
                                >
                                    Start Hiring
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </Link>
                                <a
                                    href="mailto:jobs@aganyu.com"
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 hover:bg-white/20 text-white px-5 py-4 text-xs font-bold transition-all"
                                >
                                    <Mail size={16} /> Email Vacancy
                                </a>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}

