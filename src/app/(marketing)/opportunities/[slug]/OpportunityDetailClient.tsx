"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, ShieldCheck, Building2, Calendar, DollarSign, Globe, GraduationCap, Share2, Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/dashboard/ui";
import { apiFetch } from "@/lib/api";

const CATEGORY_EMOJI: Record<string, string> = {
    SCHOLARSHIP:    "🎓",
    GRANT:          "💰",
    FUNDING:        "💸",
    TRAINING:       "📚",
    CERTIFICATION:  "🏆",
    FELLOWSHIP:     "🌍",
    INTERNSHIP:     "🏢",
    CAREER_PROGRAM: "🚀",
};

export default function OpportunityDetailClient({ opportunity, similar }: { opportunity: any; similar: any[] }) {
    const [copied, setCopied] = useState(false);
    const emoji = CATEGORY_EMOJI[opportunity.category] || "✨";

    useEffect(() => {
        apiFetch("/api/opportunities/view", {
            method: "POST",
            body: JSON.stringify({ opportunityId: opportunity.id }),
            headers: { "Content-Type": "application/json" },
        }).catch(() => {});
    }, [opportunity.id]);

    const handleApplyClick = () => {
        apiFetch("/api/opportunities/view", {
            method: "POST",
            body: JSON.stringify({ opportunityId: opportunity.id, applyClicked: true }),
            headers: { "Content-Type": "application/json" },
        }).catch(() => {});
    };

    const handleShareClick = () => {
        if (typeof window !== "undefined") {
            navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    return (
        <div className="min-h-screen bg-[#fafafa] text-slate-900 dark:bg-slate-950 dark:text-white pb-20 transition-colors duration-300">
            {/* Header Navigation Bar with Top Padding below Navbar */}
            <div className="pt-24 sm:pt-28 border-b border-stone-200/60 bg-white/80 dark:border-slate-800/80 dark:bg-slate-900/80 backdrop-blur-md px-6 py-4">
                <div className="mx-auto max-w-5xl flex items-center justify-between">
                    <Link
                        href="/opportunities"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                        <ArrowLeft size={15} /> Back to Opportunities
                    </Link>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleShareClick}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-full transition"
                        >
                            {copied ? (
                                <>
                                    <Check size={13} className="text-emerald-500" /> Copied link
                                </>
                            ) : (
                                <>
                                    <Share2 size={13} /> Share
                                </>
                            )}
                        </button>

                        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-3 py-1 rounded-full">
                            <ShieldCheck size={14} /> Verified Opportunity
                        </span>
                    </div>
                </div>
            </div>

            {/* Hero Header Card */}
            <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-8">
                <div className="rounded-3xl border border-stone-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/90 p-6 sm:p-8 shadow-sm space-y-6">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-4">
                            <span className="w-14 h-14 rounded-2xl bg-stone-100 dark:bg-slate-800 flex items-center justify-center text-3xl shrink-0">
                                {emoji}
                            </span>
                            <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge label={opportunity.category.replace("_", " ")} variant="blue" />
                                    {opportunity.funding_type && opportunity.funding_type !== "NOT_APPLICABLE" && (
                                        <Badge label={opportunity.funding_type.replace("_", " ")} variant="green" />
                                    )}
                                </div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl tracking-tight">
                                    {opportunity.title}
                                </h1>
                                <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    <Building2 size={15} /> {opportunity.organization_name}
                                </p>
                            </div>
                        </div>

                        {/* Primary Apply Action */}
                        <a
                            href={opportunity.application_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={handleApplyClick}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-7 py-3.5 text-xs font-bold shadow-md hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.98] transition-all shrink-0"
                        >
                            Apply Official Site <ExternalLink size={15} />
                        </a>
                    </div>

                    {/* Metadata Specs Bar */}
                    <div className="grid grid-cols-2 gap-4 rounded-2xl bg-stone-50/80 dark:bg-slate-800/40 p-5 border border-stone-200/50 dark:border-slate-800 sm:grid-cols-4 text-xs">
                        <div>
                            <span className="flex items-center gap-1 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                                <Calendar size={12} /> Deadline
                            </span>
                            <span className="mt-1 block font-bold text-slate-900 dark:text-white">
                                {opportunity.deadline ? new Date(opportunity.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Open / Rolling"}
                            </span>
                        </div>
                        <div>
                            <span className="flex items-center gap-1 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                                <DollarSign size={12} /> Funding Amount
                            </span>
                            <span className="mt-1 block font-bold text-slate-900 dark:text-white truncate">
                                {opportunity.funding_amount || "See official link"}
                            </span>
                        </div>
                        <div>
                            <span className="flex items-center gap-1 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                                <Globe size={12} /> Location / Region
                            </span>
                            <span className="mt-1 block font-bold text-slate-900 dark:text-white truncate">
                                {opportunity.country || opportunity.location_type}
                            </span>
                        </div>
                        <div>
                            <span className="flex items-center gap-1 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                                <GraduationCap size={12} /> Education Level
                            </span>
                            <span className="mt-1 block font-bold text-slate-900 dark:text-white truncate">
                                {opportunity.education_requirements || "Open / Any"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Layout Grid */}
            <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
                {/* Main Content Details */}
                <div className="space-y-8">
                    {/* Description */}
                    <div className="rounded-3xl border border-stone-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/90 p-6 sm:p-8 shadow-sm space-y-4">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">About the Opportunity</h2>
                        <div className="text-sm leading-relaxed font-normal text-slate-700 dark:text-slate-300 whitespace-pre-line">
                            {opportunity.description}
                        </div>
                    </div>

                    {/* Eligibility Requirements */}
                    {opportunity.eligibility_requirements && (
                        <div className="rounded-3xl border border-stone-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/90 p-6 sm:p-8 shadow-sm space-y-4">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">Eligibility Criteria</h2>
                            <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line font-normal">
                                {opportunity.eligibility_requirements}
                            </div>
                        </div>
                    )}

                    {/* Skills & Certifications */}
                    {((opportunity.required_skills?.length > 0) || (opportunity.required_certifications?.length > 0)) && (
                        <div className="rounded-3xl border border-stone-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/90 p-6 sm:p-8 shadow-sm space-y-6">
                            {opportunity.required_skills?.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Required Skills</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {opportunity.required_skills.map((skill: string) => (
                                            <span key={skill} className="rounded-xl bg-stone-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {opportunity.required_certifications?.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Target Certifications</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {opportunity.required_certifications.map((cert: string) => (
                                            <span key={cert} className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                                                {cert}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Apply Portal Box */}
                    <div className="rounded-3xl border border-stone-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/90 p-6 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Official Application</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Submissions are directed straight to the verified {opportunity.organization_name} application portal.
                        </p>
                        <a
                            href={opportunity.application_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={handleApplyClick}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow"
                        >
                            Open Portal Link <ExternalLink size={14} />
                        </a>
                    </div>

                    {/* AI Seeker Conversion Card */}
                    <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 p-6 text-white space-y-4 shadow-md border border-indigo-500/20">
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-200">
                            <Sparkles size={12} className="text-amber-400" /> Never Miss A Deadline
                        </span>
                        <h3 className="text-sm font-bold text-white">Let AI Match Opportunities For You</h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            Create your free Aganyu account to automatically receive tailored scholarship & funding matches.
                        </p>
                        <Link
                            href="/register"
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white text-slate-900 py-2.5 text-xs font-bold hover:bg-slate-100 transition"
                        >
                            Sign Up Free
                        </Link>
                    </div>

                    {/* Similar Opportunities */}
                    {similar.length > 0 && (
                        <div className="rounded-3xl border border-stone-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/90 p-6 shadow-sm space-y-4">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Similar Opportunities</h3>
                            <div className="space-y-2.5">
                                {similar.map((s) => (
                                    <Link
                                        key={s.id}
                                        href={`/opportunities/${s.slug}`}
                                        className="block rounded-2xl border border-stone-100 bg-stone-50/80 dark:border-slate-800 dark:bg-slate-800/40 p-3.5 hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
                                    >
                                        <p className="text-[10px] font-bold uppercase text-slate-400">{s.organization_name}</p>
                                        <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 mt-0.5">{s.title}</p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
