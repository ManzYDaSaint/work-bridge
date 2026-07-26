"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Sparkles, Calendar, DollarSign, ExternalLink, Globe, ArrowLeft, Building2, CheckCircle2, ShieldCheck } from "lucide-react";
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
    const emoji = CATEGORY_EMOJI[opportunity.category] || "✨";

    useEffect(() => {
        // Record page view on load
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

    return (
        <div className="min-h-screen bg-stone-50 text-slate-900 dark:bg-slate-950 dark:text-white pb-20">
            {/* Header Navigation */}
            <div className="border-b border-stone-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="mx-auto max-w-5xl flex items-center justify-between">
                    <Link
                        href="/opportunities"
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    >
                        <ArrowLeft size={14} /> Back to Opportunities
                    </Link>
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck size={14} /> Verified Opportunity
                    </span>
                </div>
            </div>

            {/* Hero Card */}
            <div className="mx-auto max-w-5xl px-6 pt-10">
                <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-4">
                            <span className="text-4xl shrink-0">{emoji}</span>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge label={opportunity.category.replace("_", " ")} variant="blue" />
                                    {opportunity.funding_type && opportunity.funding_type !== "NOT_APPLICABLE" && (
                                        <Badge label={opportunity.funding_type.replace("_", " ")} variant="green" />
                                    )}
                                </div>
                                <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                                    {opportunity.title}
                                </h1>
                                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
                                    <Building2 size={16} /> {opportunity.organization_name}
                                </p>
                            </div>
                        </div>

                        {/* Apply CTA */}
                        <a
                            href={opportunity.application_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={handleApplyClick}
                            className="flex items-center justify-center gap-2 rounded-2xl bg-[#16324f] px-8 py-3.5 text-sm font-bold text-white shadow-md transition hover:opacity-90 shrink-0"
                        >
                            Apply Official Site <ExternalLink size={16} />
                        </a>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-4 rounded-2xl bg-stone-50 p-5 dark:bg-slate-800/50 sm:grid-cols-4 text-xs">
                        <div>
                            <span className="block font-semibold text-slate-400 uppercase tracking-wider">Deadline</span>
                            <span className="mt-1 block font-bold text-slate-900 dark:text-white">
                                {opportunity.deadline ? new Date(opportunity.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Open"}
                            </span>
                        </div>
                        <div>
                            <span className="block font-semibold text-slate-400 uppercase tracking-wider">Funding</span>
                            <span className="mt-1 block font-bold text-slate-900 dark:text-white">
                                {opportunity.funding_amount || "Specified on official site"}
                            </span>
                        </div>
                        <div>
                            <span className="block font-semibold text-slate-400 uppercase tracking-wider">Location</span>
                            <span className="mt-1 block font-bold text-slate-900 dark:text-white">
                                {opportunity.country || opportunity.location_type}
                            </span>
                        </div>
                        <div>
                            <span className="block font-semibold text-slate-400 uppercase tracking-wider">Education</span>
                            <span className="mt-1 block font-bold text-slate-900 dark:text-white">
                                {opportunity.education_requirements || "Open / Any"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content & Sidebar */}
            <div className="mx-auto max-w-5xl px-6 pt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
                {/* Main Details */}
                <div className="space-y-8">
                    {/* Description */}
                    <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">About the Opportunity</h2>
                        <div className="prose prose-slate dark:prose-invert text-sm leading-relaxed whitespace-pre-line">
                            {opportunity.description}
                        </div>
                    </div>

                    {/* Eligibility */}
                    {opportunity.eligibility_requirements && (
                        <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Eligibility Criteria</h2>
                            <div className="text-sm leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300">
                                {opportunity.eligibility_requirements}
                            </div>
                        </div>
                    )}

                    {/* Skills & Certs */}
                    {((opportunity.required_skills?.length > 0) || (opportunity.required_certifications?.length > 0)) && (
                        <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
                            {opportunity.required_skills?.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Required Skills</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {opportunity.required_skills.map((skill: string) => (
                                            <span key={skill} className="rounded-xl bg-stone-100 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {opportunity.required_certifications?.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Target Certifications</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {opportunity.required_certifications.map((cert: string) => (
                                            <span key={cert} className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
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
                    {/* Apply Card Sidebar */}
                    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ready to Apply?</h3>
                        <p className="text-xs text-slate-500">
                            Applications are submitted directly on the official {opportunity.organization_name} portal.
                        </p>
                        <a
                            href={opportunity.application_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={handleApplyClick}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#16324f] py-3 text-xs font-bold text-white shadow transition hover:opacity-90"
                        >
                            Official Application Link <ExternalLink size={14} />
                        </a>
                    </div>

                    {/* Similar Opportunities */}
                    {similar.length > 0 && (
                        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Similar Opportunities</h3>
                            <div className="space-y-3">
                                {similar.map((s) => (
                                    <Link
                                        key={s.id}
                                        href={`/opportunities/${s.slug}`}
                                        className="block rounded-2xl border border-stone-100 bg-stone-50 p-4 transition hover:bg-stone-100 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800"
                                    >
                                        <p className="text-xs font-semibold text-slate-400">{s.organization_name}</p>
                                        <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 mt-0.5">{s.title}</p>
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
