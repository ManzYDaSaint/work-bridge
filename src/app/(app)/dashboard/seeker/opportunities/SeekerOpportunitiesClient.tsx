"use client";

import { useState } from "react";
import { PageHeader, Badge, EmptyState } from "@/components/dashboard/ui";
import { Sparkles, ExternalLink, Calendar, DollarSign } from "lucide-react";
import Link from "next/link";
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

export default function SeekerOpportunitiesClient({
    initialMatches,
    allOpportunities,
}: {
    initialMatches: any[];
    allOpportunities: any[];
}) {
    const [tab, setTab] = useState<"RECOMMENDED" | "ALL">(initialMatches.length > 0 ? "RECOMMENDED" : "ALL");
    const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

    const trackApplyClick = async (opportunityId: string) => {
        try {
            await apiFetch(`/api/opportunities/view`, {
                method: "POST",
                body: JSON.stringify({ opportunityId, applyClicked: true }),
                headers: { "Content-Type": "application/json" },
            });
        } catch (err) {
            console.error("Failed to track click", err);
        }
    };

    const filterByCategory = (list: any[]) => {
        if (selectedCategory === "ALL") return list;
        return list.filter((item) => {
            const cat = item.opportunity ? item.opportunity.category : item.category;
            return cat === selectedCategory;
        });
    };

    const filteredMatches = filterByCategory(initialMatches);
    const filteredAll = filterByCategory(allOpportunities);

    const categories = [
        { id: "ALL", label: "All Categories" },
        { id: "SCHOLARSHIP", label: "🎓 Scholarships" },
        { id: "GRANT", label: "💰 Grants" },
        { id: "FUNDING", label: "💸 Funding" },
        { id: "FELLOWSHIP", label: "🌍 Fellowships" },
        { id: "TRAINING", label: "📚 Training" },
    ];

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="My Opportunities"
                subtitle="Scholarships, grants, funding, and career growth programs matched to your professional profile."
            />

            {/* Tabs & Category Filter */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex w-fit rounded-2xl border border-stone-200 bg-stone-50 p-1 dark:border-slate-700/50 dark:bg-slate-800/50">
                    <button
                        onClick={() => setTab("RECOMMENDED")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                            tab === "RECOMMENDED"
                                ? "bg-white dark:bg-slate-700 text-[#16324f] dark:text-white shadow-sm"
                                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                        }`}
                    >
                        ✨ Recommended ({initialMatches.length})
                    </button>
                    <button
                        onClick={() => setTab("ALL")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                            tab === "ALL"
                                ? "bg-white dark:bg-slate-700 text-[#16324f] dark:text-white shadow-sm"
                                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                        }`}
                    >
                        🌐 All Opportunities ({allOpportunities.length})
                    </button>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all shrink-0 ${
                                selectedCategory === cat.id
                                    ? "bg-amber-500 text-white shadow-sm"
                                    : "bg-stone-100 text-slate-600 hover:bg-stone-200 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            {tab === "RECOMMENDED" ? (
                filteredMatches.length === 0 ? (
                    <EmptyState
                        icon={Sparkles}
                        title="No opportunities in this category"
                        description="Try selecting a different category filter or browse all opportunities."
                        action={{ label: "Show All Categories", onClick: () => setSelectedCategory("ALL") }}
                    />
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {filteredMatches.map((m) => {
                            const opp = m.opportunity;
                            if (!opp) return null;
                            const emoji = CATEGORY_EMOJI[opp.category] || "✨";

                            return (
                                <div
                                    key={m.id}
                                    className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-2.5">
                                                <span className="text-2xl">{emoji}</span>
                                                <div>
                                                    <Badge label={opp.category.replace("_", " ")} variant="blue" />
                                                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                        {opp.organization_name}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* AI Match Badge */}
                                            <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                                <Sparkles size={13} />
                                                {m.match_score}% Match
                                            </div>
                                        </div>

                                        <h3 className="text-base font-semibold text-slate-900 dark:text-white line-clamp-1">
                                            <Link href={`/opportunities/${opp.slug}`} className="hover:underline">
                                                {opp.title}
                                            </Link>
                                        </h3>

                                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                                            {opp.short_description}
                                        </p>

                                        {/* AI Justification */}
                                        {m.match_reason && (
                                            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                                                <p className="font-semibold text-slate-900 dark:text-white mb-0.5">Why you match:</p>
                                                <p>{m.match_reason}</p>
                                            </div>
                                        )}

                                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                            {opp.deadline && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    Deadline: {new Date(opp.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                                </span>
                                            )}
                                            {opp.funding_amount && (
                                                <span className="flex items-center gap-1">
                                                    <DollarSign size={12} />
                                                    {opp.funding_amount}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4 dark:border-slate-800">
                                        <Link
                                            href={`/opportunities/${opp.slug}`}
                                            className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                                        >
                                            View Details
                                        </Link>
                                        <a
                                            href={opp.application_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => trackApplyClick(opp.id)}
                                            className="flex items-center gap-1.5 rounded-xl bg-[#16324f] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                                        >
                                            Apply Now <ExternalLink size={13} />
                                        </a>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            ) : (
                filteredAll.length === 0 ? (
                    <EmptyState
                        icon={Sparkles}
                        title="No opportunities found"
                        description="There are currently no opportunities listed in this category."
                        action={{ label: "Show All Categories", onClick: () => setSelectedCategory("ALL") }}
                    />
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {filteredAll.map((opp) => {
                        const emoji = CATEGORY_EMOJI[opp.category] || "✨";

                        return (
                            <div
                                key={opp.id}
                                className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-2xl">{emoji}</span>
                                            <div>
                                                <Badge label={opp.category.replace("_", " ")} variant="slate" />
                                                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                    {opp.organization_name}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <h3 className="text-base font-semibold text-slate-900 dark:text-white line-clamp-1">
                                        <Link href={`/opportunities/${opp.slug}`} className="hover:underline">
                                            {opp.title}
                                        </Link>
                                    </h3>

                                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                                        {opp.short_description}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                        {opp.deadline && (
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                Deadline: {new Date(opp.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                            </span>
                                        )}
                                        {opp.funding_amount && (
                                            <span className="flex items-center gap-1">
                                                <DollarSign size={12} />
                                                {opp.funding_amount}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4 dark:border-slate-800">
                                    <Link
                                        href={`/opportunities/${opp.slug}`}
                                        className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                                    >
                                        View Details
                                    </Link>
                                    <a
                                        href={opp.application_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => trackApplyClick(opp.id)}
                                        className="flex items-center gap-1.5 rounded-xl bg-[#16324f] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                                    >
                                        Apply Now <ExternalLink size={13} />
                                    </a>
                                </div>
                            </div>
                        );
                        })}
                    </div>
                )
            )}
        </div>
    );
}
