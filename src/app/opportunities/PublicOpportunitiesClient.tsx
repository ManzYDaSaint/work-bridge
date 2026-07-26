"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Calendar, DollarSign, ExternalLink, Globe, Search } from "lucide-react";
import { Badge } from "@/components/dashboard/ui";

const CATEGORIES = [
    { value: "ALL", label: "All Opportunities" },
    { value: "SCHOLARSHIP", label: "🎓 Scholarships" },
    { value: "GRANT", label: "💰 Grants" },
    { value: "FUNDING", label: "💸 Funding" },
    { value: "TRAINING", label: "📚 Training" },
    { value: "CERTIFICATION", label: "🏆 Certifications" },
    { value: "FELLOWSHIP", label: "🌍 Fellowships" },
    { value: "INTERNSHIP", label: "🏢 Internships" },
    { value: "CAREER_PROGRAM", label: "🚀 Career Programs" },
];

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

export default function PublicOpportunitiesClient({ initialOpportunities }: { initialOpportunities: any[] }) {
    const [category, setCategory] = useState("ALL");
    const [search, setSearch] = useState("");

    const filtered = initialOpportunities.filter((opp) => {
        const matchCat = category === "ALL" || opp.category === category;
        const matchSearch =
            !search ||
            opp.title.toLowerCase().includes(search.toLowerCase()) ||
            opp.organization_name.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchSearch;
    });

    return (
        <div className="min-h-screen bg-stone-50 text-slate-900 dark:bg-slate-950 dark:text-white">
            {/* Hero Section */}
            <div className="bg-[#16324f] px-6 py-16 text-white text-center">
                <div className="mx-auto max-w-3xl space-y-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                        <Sparkles size={14} className="text-amber-400" /> Aganyu Opportunities Ecosystem
                    </span>
                    <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
                        Discover Verified Scholarships & Funding
                    </h1>
                    <p className="text-sm text-slate-300 sm:text-base">
                        Unlock verified global scholarships, fellowship grants, training programs, and career growth opportunities powered by AI.
                    </p>
                </div>
            </div>

            {/* Container */}
            <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
                {/* Search & Category Filter */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by title or organisation…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-2xl border border-stone-200 bg-white px-12 py-3 text-sm outline-none focus:border-[#16324f] dark:border-slate-800 dark:bg-slate-900"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((c) => (
                            <button
                                key={c.value}
                                onClick={() => setCategory(c.value)}
                                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                                    category === c.value
                                        ? "border-[#16324f] bg-[#16324f] text-white"
                                        : "border-stone-200 bg-white text-slate-600 hover:bg-stone-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                                }`}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List */}
                {filtered.length === 0 ? (
                    <div className="py-20 text-center space-y-3">
                        <Sparkles className="mx-auto text-slate-400" size={32} />
                        <p className="text-base font-semibold">No opportunities found</p>
                        <p className="text-xs text-slate-500">Try clearing filters or search terms.</p>
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((opp) => {
                            const emoji = CATEGORY_EMOJI[opp.category] || "✨";

                            return (
                                <div
                                    key={opp.id}
                                    className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-3xl">{emoji}</span>
                                            {opp.featured && (
                                                <Badge label="Featured" variant="yellow" />
                                            )}
                                        </div>

                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                {opp.organization_name}
                                            </p>
                                            <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white line-clamp-2">
                                                <Link href={`/opportunities/${opp.slug}`} className="hover:underline">
                                                    {opp.title}
                                                </Link>
                                            </h2>
                                        </div>

                                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                                            {opp.short_description}
                                        </p>

                                        <div className="space-y-1.5 pt-2 text-xs text-slate-500 dark:text-slate-400">
                                            {opp.deadline && (
                                                <p className="flex items-center gap-1.5">
                                                    <Calendar size={13} className="text-slate-400" />
                                                    Deadline: {new Date(opp.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                                </p>
                                            )}
                                            {opp.funding_amount && (
                                                <p className="flex items-center gap-1.5">
                                                    <DollarSign size={13} className="text-slate-400" />
                                                    Funding: {opp.funding_amount}
                                                </p>
                                            )}
                                            {opp.country && (
                                                <p className="flex items-center gap-1.5">
                                                    <Globe size={13} className="text-slate-400" />
                                                    {opp.country}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-6 border-t border-stone-100 pt-4 dark:border-slate-800">
                                        <Link
                                            href={`/opportunities/${opp.slug}`}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#16324f] px-4 py-2.5 text-xs font-semibold text-white transition hover:opacity-90"
                                        >
                                            View & Apply <ExternalLink size={14} />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
