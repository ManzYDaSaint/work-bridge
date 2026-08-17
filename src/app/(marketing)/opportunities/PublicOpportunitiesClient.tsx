"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Calendar, DollarSign, ArrowUpRight, Globe, Search, Filter, X, ArrowUpDown, UserPlus } from "lucide-react";

const CATEGORIES = [
    { value: "ALL", label: "All Opportunities", emoji: "✨" },
    { value: "SCHOLARSHIP", label: "Scholarships", emoji: "🎓" },
    { value: "GRANT", label: "Grants", emoji: "💰" },
    { value: "FUNDING", label: "Funding", emoji: "💸" },
    { value: "TRAINING", label: "Training", emoji: "📚" },
    { value: "CERTIFICATION", label: "Certifications", emoji: "🏆" },
    { value: "FELLOWSHIP", label: "Fellowships", emoji: "🌍" },
    { value: "INTERNSHIP", label: "Internships", emoji: "🏢" },
    { value: "CAREER_PROGRAM", label: "Career Programs", emoji: "🚀" },
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
    const [sortBy, setSortBy] = useState<"NEWEST" | "EXPIRING_SOON">("NEWEST");

    // Dynamic Category Counts
    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = { ALL: initialOpportunities.length };
        initialOpportunities.forEach((opp) => {
            if (opp.category) {
                counts[opp.category] = (counts[opp.category] || 0) + 1;
            }
        });
        return counts;
    }, [initialOpportunities]);

    // Filtering & Sorting
    const filtered = useMemo(() => {
        let result = initialOpportunities.filter((opp) => {
            const matchCat = category === "ALL" || opp.category === category;
            const matchSearch =
                !search ||
                opp.title.toLowerCase().includes(search.toLowerCase()) ||
                opp.organization_name.toLowerCase().includes(search.toLowerCase());
            return matchCat && matchSearch;
        });

        if (sortBy === "EXPIRING_SOON") {
            result = [...result].sort((a, b) => {
                if (!a.deadline) return 1;
                if (!b.deadline) return -1;
                return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
            });
        } else {
            // NEWEST by published_at or created_at
            result = [...result].sort((a, b) => {
                const timeA = a.published_at ? new Date(a.published_at).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
                const timeB = b.published_at ? new Date(b.published_at).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
                return timeB - timeA;
            });
        }

        return result;
    }, [initialOpportunities, category, search, sortBy]);

    return (
        <div className="min-h-screen bg-[#fafafa] text-slate-900 dark:bg-slate-950 dark:text-white transition-colors duration-300">
            {/* Hero Section with Extra Top Spacing below Floating Navbar */}
            <section className="relative overflow-hidden pt-24 sm:pt-28 pb-16 md:pt-36 md:pb-24 border-b border-stone-200/60 dark:border-slate-800/80">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-500/10 via-indigo-500/15 to-purple-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

                <div className="mx-auto max-w-4xl px-6 text-center space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 rounded-full border border-stone-200/80 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 backdrop-blur-md shadow-sm"
                    >
                        <Sparkles size={14} className="text-amber-500 animate-pulse" />
                        <span>Curated Opportunities Gateway</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-4xl font-extrabold tracking-tight sm:text-6xl text-slate-900 dark:text-white leading-[1.15]"
                    >
                        Global Scholarships, <br className="hidden sm:inline" />
                        <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                            Grants & Fellowships
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="mx-auto max-w-2xl text-base text-slate-600 dark:text-slate-400 font-normal leading-relaxed"
                    >
                        Discover verified funding programs, career fellowships, and specialized grants to accelerate your professional trajectory.
                    </motion.p>
                </div>
            </section>

            {/* Main Content Container */}
            <main className="mx-auto max-w-7xl px-4 sm:px-6 py-12 space-y-10">
                {/* Search & Filter Controls */}
                <div className="space-y-6">
                    {/* Floating Search Field & Sort Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-3xl mx-auto">
                        <div className="relative flex items-center w-full rounded-2xl border border-stone-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-lg shadow-slate-200/40 dark:shadow-none backdrop-blur-xl transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/60 p-1.5">
                            <Search className="ml-3.5 text-slate-400 shrink-0" size={18} />
                            <input
                                type="text"
                                placeholder="Search by grant, scholarship or organization..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none font-medium"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch("")}
                                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 transition"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Sort Selector */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <ArrowUpDown size={14} className="text-slate-400" />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="rounded-xl border border-stone-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition"
                            >
                                <option value="NEWEST">Recently Added</option>
                                <option value="EXPIRING_SOON">Expiring Soonest</option>
                            </select>
                        </div>
                    </div>

                    {/* Category Pill Filters with Dynamic Item Counts */}
                    <div className="flex items-center justify-start md:justify-center overflow-x-auto no-scrollbar gap-2 py-1 px-2">
                        {CATEGORIES.map((c) => {
                            const active = category === c.value;
                            const count = categoryCounts[c.value] || 0;

                            return (
                                <button
                                    key={c.value}
                                    onClick={() => setCategory(c.value)}
                                    className={`relative shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 select-none flex items-center gap-1.5 ${
                                        active
                                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md shadow-slate-900/10 dark:shadow-none"
                                            : "bg-white text-slate-600 hover:bg-stone-100/80 hover:text-slate-900 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-white border border-stone-200/60 dark:border-slate-800"
                                    }`}
                                >
                                    <span>{c.emoji}</span>
                                    <span>{c.label}</span>
                                    {count > 0 && (
                                        <span
                                            className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                                                active
                                                    ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900"
                                                    : "bg-stone-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                            }`}
                                        >
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Listing Status Bar */}
                <div className="flex items-center justify-between border-b border-stone-200/60 dark:border-slate-800/80 pb-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Showing {filtered.length} {filtered.length === 1 ? "Opportunity" : "Opportunities"}
                    </span>
                    {(search || category !== "ALL") && (
                        <button
                            onClick={() => {
                                setSearch("");
                                setCategory("ALL");
                            }}
                            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                            Reset filters
                        </button>
                    )}
                </div>

                {/* Opportunity Grid */}
                {filtered.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="py-24 text-center space-y-4 rounded-3xl border border-dashed border-stone-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                            <Filter size={22} />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">No matching opportunities</h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            We couldn't find any opportunities matching your criteria. Try adjusting your search term or category filters.
                        </p>
                        <button
                            onClick={() => {
                                setSearch("");
                                setCategory("ALL");
                            }}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 text-xs font-semibold hover:opacity-90 transition"
                        >
                            Clear filters
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        layout
                        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                    >
                        <AnimatePresence mode="popLayout">
                            {filtered.map((opp, index) => {
                                const emoji = CATEGORY_EMOJI[opp.category] || "✨";
                                const isExpired = opp.deadline && new Date(opp.deadline) < new Date();

                                return (
                                    <div key={opp.id} className="contents">
                                        {/* Inline Conversion Banner Card every 6th Opportunity */}
                                        {index === 3 && (
                                            <motion.div
                                                layout
                                                initial={{ opacity: 0, y: 15 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="flex flex-col justify-between rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 p-6 text-white shadow-xl border border-indigo-500/30 relative overflow-hidden"
                                            >
                                                <div className="space-y-3 relative z-10">
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-200 backdrop-blur">
                                                        <Sparkles size={12} className="text-amber-400" /> AI Smart Matching
                                                    </span>
                                                    <h3 className="text-xl font-bold tracking-tight text-white leading-snug">
                                                        Get Automated Opportunities Matched To You
                                                    </h3>
                                                    <p className="text-xs text-slate-300 leading-relaxed font-normal">
                                                        Create a free Seeker profile and let our AI engine match funding, fellowships, and jobs tailored to your skills.
                                                    </p>
                                                </div>
                                                <div className="mt-6 pt-4 border-t border-white/10 relative z-10">
                                                    <Link
                                                        href="/register"
                                                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white text-slate-900 px-4 py-2.5 text-xs font-bold hover:bg-slate-100 transition shadow-sm"
                                                    >
                                                        <UserPlus size={14} /> Join Aganyu Free
                                                    </Link>
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* Opportunity Card */}
                                        <motion.div
                                            layout
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.3 }}
                                            className="group relative flex flex-col justify-between rounded-3xl border border-stone-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-6 shadow-sm hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                                        >
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-slate-800/80 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                                                        {emoji}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        {opp.featured && (
                                                            <span className="rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                                                Featured
                                                            </span>
                                                        )}
                                                        <span className="rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                                            {opp.category.replace("_", " ")}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div>
                                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                                                        {opp.organization_name}
                                                    </span>
                                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug">
                                                        <Link href={`/opportunities/${opp.slug}`}>
                                                            {opp.title}
                                                        </Link>
                                                    </h3>
                                                </div>

                                                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed font-normal">
                                                    {opp.short_description}
                                                </p>
                                            </div>

                                            <div className="mt-6 pt-4 border-t border-stone-100 dark:border-slate-800/60 space-y-4">
                                                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                                    {opp.deadline && (
                                                        <div className="flex items-center gap-1.5 truncate">
                                                            <Calendar size={13} className="text-slate-400 shrink-0" />
                                                            <span className={isExpired ? "text-rose-500 font-semibold" : ""}>
                                                                {new Date(opp.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {opp.funding_amount && (
                                                        <div className="flex items-center gap-1.5 truncate">
                                                            <DollarSign size={13} className="text-slate-400 shrink-0" />
                                                            <span className="truncate">{opp.funding_amount}</span>
                                                        </div>
                                                    )}
                                                    {opp.country && (
                                                        <div className="flex items-center gap-1.5 truncate col-span-2">
                                                            <Globe size={13} className="text-slate-400 shrink-0" />
                                                            <span className="truncate">{opp.country}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <Link
                                                    href={`/opportunities/${opp.slug}`}
                                                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.98] transition-all shadow-sm group/btn"
                                                >
                                                    View Opportunity
                                                    <ArrowUpRight size={15} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                                </Link>
                                            </div>
                                        </motion.div>
                                    </div>
                                );
                            })}
                        </AnimatePresence>
                    </motion.div>
                )}
            </main>
        </div>
    );
}
