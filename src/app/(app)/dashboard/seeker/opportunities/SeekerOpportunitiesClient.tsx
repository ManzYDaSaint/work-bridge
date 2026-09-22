"use client";

import { useState, useMemo } from "react";
import { PageHeader, EmptyState, Pagination } from "@/components/dashboard/ui";
import { Sparkles, ExternalLink, Calendar, Banknote, Building2, MapPin } from "lucide-react";
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

const ITEMS_PER_PAGE = 6;

export default function SeekerOpportunitiesClient({
    initialMatches,
    allOpportunities,
}: {
    initialMatches: any[];
    allOpportunities: any[];
}) {
    const [tab, setTab] = useState<"RECOMMENDED" | "ALL">(initialMatches.length > 0 ? "RECOMMENDED" : "ALL");
    const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
    const [currentPage, setCurrentPage] = useState<number>(1);

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

    const handleTabChange = (newTab: "RECOMMENDED" | "ALL") => {
        setTab(newTab);
        setCurrentPage(1);
    };

    const handleCategoryChange = (catId: string) => {
        setSelectedCategory(catId);
        setCurrentPage(1);
    };

    const filteredMatches = useMemo(() => {
        if (selectedCategory === "ALL") return initialMatches;
        return initialMatches.filter((item) => {
            const cat = item.opportunity ? item.opportunity.category : item.category;
            return cat === selectedCategory;
        });
    }, [initialMatches, selectedCategory]);

    const filteredAll = useMemo(() => {
        if (selectedCategory === "ALL") return allOpportunities;
        return allOpportunities.filter((item) => {
            const cat = item.opportunity ? item.opportunity.category : item.category;
            return cat === selectedCategory;
        });
    }, [allOpportunities, selectedCategory]);

    const activeList = tab === "RECOMMENDED" ? filteredMatches : filteredAll;

    const totalPages = Math.ceil(activeList.length / ITEMS_PER_PAGE);

    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return activeList.slice(start, start + ITEMS_PER_PAGE);
    }, [activeList, currentPage]);

    const categories = [
        { id: "ALL", label: "All Types" },
        { id: "SCHOLARSHIP", label: "🎓 Scholarships" },
        { id: "GRANT", label: "💰 Grants" },
        { id: "FUNDING", label: "💸 Funding" },
        { id: "FELLOWSHIP", label: "🌍 Fellowships" },
        { id: "TRAINING", label: "📚 Training" },
    ];

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Opportunities"
                subtitle="Curated scholarships, grants, fellowships, and training programs to boost your growth."
            />

            {/* Controls Bar: Switcher + Filter Pills */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex items-center gap-1 rounded-2xl border border-stone-200/80 bg-stone-100/70 p-1 dark:border-slate-800 dark:bg-slate-900/80">
                    <button
                        onClick={() => handleTabChange("RECOMMENDED")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            tab === "RECOMMENDED"
                                ? "bg-white dark:bg-slate-800 text-[#16324f] dark:text-amber-400 shadow-sm"
                                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                        }`}
                    >
                        ✨ Recommended ({initialMatches.length})
                    </button>
                    <button
                        onClick={() => handleTabChange("ALL")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            tab === "ALL"
                                ? "bg-white dark:bg-slate-800 text-[#16324f] dark:text-amber-400 shadow-sm"
                                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                        }`}
                    >
                        🌐 All Opportunities ({allOpportunities.length})
                    </button>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => handleCategoryChange(cat.id)}
                            className={`rounded-2xl px-3 py-1.5 text-xs font-semibold transition-all shrink-0 border ${
                                selectedCategory === cat.id
                                    ? "bg-[#16324f] text-white border-[#16324f] dark:bg-amber-400 dark:text-slate-950 dark:border-amber-400 shadow-xs"
                                    : "bg-white text-slate-600 border-stone-200 hover:bg-stone-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800/80"
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Opportunities List Grid */}
            {activeList.length === 0 ? (
                <EmptyState
                    icon={Sparkles}
                    title="No opportunities found"
                    description="There are currently no opportunities listed matching this filter criteria."
                    action={{ label: "Reset Filters", onClick: () => handleCategoryChange("ALL") }}
                />
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {paginatedItems.map((item) => {
                        const isMatch = tab === "RECOMMENDED";
                        const opp = isMatch ? item.opportunity : item;
                        if (!opp) return null;

                        const emoji = CATEGORY_EMOJI[opp.category] || "✨";
                        const catLabel = opp.category ? opp.category.replace("_", " ") : "OPPORTUNITY";

                        return (
                            <div
                                key={item.id || opp.id}
                                className="group relative flex flex-col justify-between rounded-3xl border border-stone-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:border-stone-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                            >
                                <div className="space-y-3.5">
                                    {/* Card Header Top Row */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-xl dark:bg-slate-800">
                                                {emoji}
                                            </div>
                                            <div className="min-w-0">
                                                <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-slate-700 uppercase dark:bg-slate-800 dark:text-slate-300">
                                                    {catLabel}
                                                </span>
                                                <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-slate-500 truncate dark:text-slate-400">
                                                    <Building2 size={11} className="shrink-0" />
                                                    <span className="truncate">{opp.organization_name || "Provider"}</span>
                                                </p>
                                            </div>
                                        </div>

                                        {/* AI Match Badge (If Recommended) */}
                                        {isMatch && item.match_score && (
                                            <div className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
                                                <Sparkles size={12} />
                                                {item.match_score}% Match
                                            </div>
                                        )}
                                    </div>

                                    {/* Opportunity Title */}
                                    <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white line-clamp-2 group-hover:text-[#16324f] dark:group-hover:text-amber-400 transition-colors">
                                        <Link href={`/opportunities/${opp.slug}`}>
                                            {opp.title}
                                        </Link>
                                    </h3>

                                    {/* Short Description */}
                                    {opp.short_description && (
                                        <p className="text-xs text-slate-600 leading-relaxed dark:text-slate-300 line-clamp-2">
                                            {opp.short_description}
                                        </p>
                                    )}

                                    {/* AI Match Reason Pill Box */}
                                    {isMatch && item.match_reason && (
                                        <div className="rounded-2xl border border-amber-200/60 bg-amber-50/50 p-2.5 text-[11px] leading-relaxed text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-200">
                                            <span className="font-bold flex items-center gap-1 mb-0.5">
                                                <Sparkles size={11} className="text-amber-600 dark:text-amber-400" />
                                                Why you match:
                                            </span>
                                            <p className="line-clamp-2">{item.match_reason}</p>
                                        </div>
                                    )}

                                    {/* Micro Metrics Strip */}
                                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                                        {opp.funding_amount && (
                                            <span className="inline-flex items-center gap-1 rounded-xl bg-stone-100 px-2.5 py-1 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                                <Banknote size={13} className="text-emerald-600 dark:text-emerald-400" />
                                                {opp.funding_amount}
                                            </span>
                                        )}
                                        {opp.deadline && (
                                            <span className="inline-flex items-center gap-1 rounded-xl bg-stone-100 px-2.5 py-1 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                <Calendar size={13} className="text-amber-500" />
                                                Deadline: {new Date(opp.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                            </span>
                                        )}
                                        {opp.location && (
                                            <span className="inline-flex items-center gap-1 rounded-xl bg-stone-100 px-2.5 py-1 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                <MapPin size={13} className="text-slate-400" />
                                                {opp.location}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Footer Action Bar */}
                                <div className="mt-5 flex items-center gap-2 border-t border-stone-100 pt-3.5 dark:border-slate-800">
                                    <Link
                                        href={`/opportunities/${opp.slug}`}
                                        className="flex-1 rounded-2xl border border-stone-200 bg-stone-50 py-2 text-center text-xs font-bold text-slate-700 hover:bg-stone-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 transition"
                                    >
                                        View Details
                                    </Link>
                                    <a
                                        href={opp.application_url || `/opportunities/${opp.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => trackApplyClick(opp.id)}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#16324f] py-2 text-xs font-bold text-white transition hover:bg-[#16324f]/90 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300"
                                    >
                                        Apply Now <ExternalLink size={13} />
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination Strip */}
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={activeList.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={(page) => setCurrentPage(page)}
            />
        </div>
    );
}

