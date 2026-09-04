"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { PageHeader, Badge, StatCard, EmptyState } from "@/components/dashboard/ui";
import {
    Sparkles, Plus, Eye, Edit, Archive, Star, Send,
    GraduationCap, DollarSign, BookOpen, Briefcase, Award, Globe, Building2, Rocket,
    BarChart3, MousePointerClick, Users, Search
} from "lucide-react";
import Link from "next/link";
import OpportunityIngestionQueue from "./OpportunityIngestionQueue";

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<string, "green" | "blue" | "yellow" | "slate" | "red"> = {
    PUBLISHED:     "green",
    FEATURED:      "blue",
    CLOSING_SOON:  "yellow",
    DRAFT:         "slate",
    EXPIRED:       "red",
    ARCHIVED:      "slate",
};

const CATEGORY_ICON: Record<string, React.ElementType> = {
    SCHOLARSHIP:    GraduationCap,
    GRANT:          DollarSign,
    FUNDING:        DollarSign,
    TRAINING:       BookOpen,
    CERTIFICATION:  Award,
    FELLOWSHIP:     Globe,
    INTERNSHIP:     Building2,
    CAREER_PROGRAM: Rocket,
};

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

function formatDeadline(deadline: string | null) {
    if (!deadline) return "No deadline";
    const d = new Date(deadline);
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "Expired";
    if (diffDays === 0) return "Closes today";
    if (diffDays <= 7) return `${diffDays}d left`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ── Main Client Component ─────────────────────────────────────────────────────

export default function AdminOpportunitiesClient({
    initialOpportunities,
    analytics,
}: {
    initialOpportunities: any[];
    analytics: any;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [opportunities, setOpportunities] = useState<any[]>(initialOpportunities);
    const [actioning, setActioning] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<"active" | "ingestion">(
        searchParams.get("tab") === "ingestion" ? "ingestion" : "active"
    );

    const filtered = opportunities.filter((o) => {
        const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
        const matchesSearch =
            !search ||
            o.title.toLowerCase().includes(search.toLowerCase()) ||
            o.organization_name.toLowerCase().includes(search.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const handlePublish = async (id: string, featured: boolean) => {
        setActioning(id);
        try {
            const res = await apiFetch(`/api/admin/opportunities/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ action: "publish", featured }),
                headers: { "Content-Type": "application/json" },
            });
            if (res.ok) {
                toast.success(featured ? "Opportunity featured & published!" : "Opportunity published!");
                setOpportunities((prev) =>
                    prev.map((o) => (o.id === id ? { ...o, status: featured ? "FEATURED" : "PUBLISHED", featured } : o))
                );
                router.refresh();
            } else {
                const err = await res.json();
                toast.error(err.error || "Publish failed.");
            }
        } finally {
            setActioning(null);
        }
    };

    const handleArchive = async (id: string) => {
        if (!confirm("Archive this opportunity? It will be removed from public view.")) return;
        setActioning(id);
        try {
            const res = await apiFetch(`/api/admin/opportunities/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ action: "archive" }),
                headers: { "Content-Type": "application/json" },
            });
            if (res.ok) {
                toast.success("Opportunity archived.");
                setOpportunities((prev) =>
                    prev.map((o) => (o.id === id ? { ...o, status: "ARCHIVED" } : o))
                );
                router.refresh();
            } else {
                toast.error("Archive failed.");
            }
        } finally {
            setActioning(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Permanently delete this opportunity? This cannot be undone.")) return;
        setActioning(id);
        try {
            const res = await apiFetch(`/api/admin/opportunities/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Opportunity deleted.");
                setOpportunities((prev) => prev.filter((o) => o.id !== id));
                router.refresh();
            } else {
                const err = await res.json();
                toast.error(err.error || "Delete failed.");
            }
        } finally {
            setActioning(null);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Opportunities"
                subtitle="Publish scholarships, fellowships, grants, and career programs. AI matches them to candidates automatically."
                action={{
                    label: "Create Opportunity",
                    href: "/dashboard/admin/opportunities/create",
                    icon: Plus,
                }}
            />

            {/* Sub Navigation Tabs */}
            <div className="flex border-b border-stone-200 dark:border-slate-800">
                <button
                    onClick={() => {
                        setActiveTab("active");
                        router.replace("/dashboard/admin/opportunities", { scroll: false });
                    }}
                    className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                        activeTab === "active"
                            ? "border-amber-500 text-amber-600 dark:text-amber-400"
                            : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
                    }`}
                >
                    <GraduationCap className="h-4 w-4" /> Published & Draft Opportunities
                </button>
                <button
                    onClick={() => {
                        setActiveTab("ingestion");
                        router.replace("/dashboard/admin/opportunities?tab=ingestion", { scroll: false });
                    }}
                    className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                        activeTab === "ingestion"
                            ? "border-amber-500 text-amber-600 dark:text-amber-400"
                            : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
                    }`}
                >
                    <Sparkles className="h-4 w-4 text-amber-500" /> Automated Ingestion Queue
                </button>
            </div>

            {activeTab === "ingestion" ? (
                <OpportunityIngestionQueue />
            ) : (
                <div className="space-y-5">
                    {/* Analytics cards */}
                    {analytics && (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <StatCard
                                label="Total Published"
                                value={(analytics.byStatus.PUBLISHED ?? 0) + (analytics.byStatus.FEATURED ?? 0)}
                                icon={Sparkles}
                                iconBg="bg-blue-50"
                                iconColor="text-blue-600"
                            />
                            <StatCard
                                label="AI Matches"
                                value={analytics.totalMatches ?? 0}
                                icon={Users}
                                iconBg="bg-purple-50"
                                iconColor="text-purple-600"
                            />
                            <StatCard
                                label="Total Views"
                                value={analytics.totalViews ?? 0}
                                icon={BarChart3}
                                iconBg="bg-emerald-50"
                                iconColor="text-emerald-600"
                            />
                            <StatCard
                                label="Apply Clicks"
                                value={analytics.totalApplyClicks ?? 0}
                                icon={MousePointerClick}
                                iconBg="bg-amber-50"
                                iconColor="text-amber-600"
                            />
                        </div>
                    )}

                    {/* Status Filter Tabs */}
                    <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800">
                        <div className="flex overflow-x-auto">
                            {[
                                { key: "ALL", label: "All Opportunities" },
                                { key: "PUBLISHED", label: "Published" },
                                { key: "FEATURED", label: "Featured" },
                                { key: "CLOSING_SOON", label: "Closing Soon" },
                                { key: "DRAFT", label: "Drafts" },
                                { key: "EXPIRED", label: "Expired" },
                                { key: "ARCHIVED", label: "Archived" },
                            ].map((s) => (
                                <button
                                    key={s.key}
                                    onClick={() => setStatusFilter(s.key)}
                                    className={`inline-flex items-center gap-1.5 border-b-2 px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                                        statusFilter === s.key
                                            ? "border-amber-500 text-amber-600 dark:text-amber-400 font-bold"
                                            : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                    }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by title or organisation..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-2xl border border-stone-200 bg-white px-12 py-3 text-sm outline-none focus:border-stone-300 dark:border-slate-700 dark:bg-slate-900"
                        />
                    </div>

            {/* Opportunities table */}
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70">
                {/* Header row */}
                <div className="hidden grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 border-b border-stone-200/70 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:border-slate-800 sm:grid">
                    <span>Opportunity</span>
                    <span>Status</span>
                    <span>Deadline</span>
                    <span className="text-right">Actions</span>
                </div>

                {filtered.length === 0 ? (
                    <EmptyState
                        icon={Sparkles}
                        title="No opportunities yet"
                        description="Create your first opportunity and let AI match it to the right candidates."
                        action={{ label: "Create Opportunity", href: "/dashboard/admin/opportunities/create" }}
                    />
                ) : (
                    filtered.map((opp) => {
                        const CatIcon = CATEGORY_ICON[opp.category] ?? Briefcase;
                        const emoji = CATEGORY_EMOJI[opp.category] ?? "✨";
                        const isLoading = actioning === opp.id;

                        return (
                            <div
                                key={opp.id}
                                className="grid grid-cols-1 gap-4 border-b border-stone-200/70 px-5 py-4 last:border-b-0 dark:border-slate-800 sm:grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center"
                            >
                                {/* Title + org */}
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-base dark:bg-slate-800">
                                        {emoji}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                            {opp.title}
                                        </p>
                                        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                            <CatIcon size={11} />
                                            {opp.organization_name} · {opp.category.replace("_", " ")}
                                        </p>
                                    </div>
                                </div>

                                {/* Status */}
                                <div>
                                    <Badge
                                        label={opp.status.replace("_", " ")}
                                        variant={STATUS_VARIANT[opp.status] ?? "slate"}
                                    />
                                    {opp.featured && (
                                        <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                                            <Star size={11} className="fill-amber-400 text-amber-400" /> Featured
                                        </span>
                                    )}
                                </div>

                                {/* Deadline */}
                                <p className={`text-xs font-medium ${
                                    opp.deadline && new Date(opp.deadline) < new Date()
                                        ? "text-red-500"
                                        : "text-slate-500 dark:text-slate-400"
                                }`}>
                                    {formatDeadline(opp.deadline)}
                                </p>

                                {/* Actions */}
                                <div className="flex items-center gap-1.5 sm:justify-end">
                                    <Link
                                        href={`/opportunities/${opp.slug}`}
                                        target="_blank"
                                        className="rounded-xl border border-stone-200 p-2 text-slate-500 hover:text-blue-600 dark:border-slate-700"
                                        title="Preview public page"
                                    >
                                        <Eye size={15} />
                                    </Link>
                                    <Link
                                        href={`/dashboard/admin/opportunities/${opp.id}/edit`}
                                        className="rounded-xl border border-stone-200 p-2 text-slate-500 hover:text-slate-900 dark:border-slate-700"
                                        title="Edit"
                                    >
                                        <Edit size={15} />
                                    </Link>
                                    {(opp.status === "DRAFT") && (
                                        <>
                                            <button
                                                onClick={() => handlePublish(opp.id, false)}
                                                disabled={isLoading}
                                                className="rounded-xl border border-stone-200 p-2 text-slate-500 hover:text-emerald-600 disabled:opacity-40 dark:border-slate-700"
                                                title="Publish"
                                            >
                                                <Send size={15} />
                                            </button>
                                            <button
                                                onClick={() => handlePublish(opp.id, true)}
                                                disabled={isLoading}
                                                className="rounded-xl border border-stone-200 p-2 text-slate-500 hover:text-amber-500 disabled:opacity-40 dark:border-slate-700"
                                                title="Publish as Featured"
                                            >
                                                <Star size={15} />
                                            </button>
                                        </>
                                    )}
                                    {(opp.status === "PUBLISHED" || opp.status === "FEATURED") && (
                                        <button
                                            onClick={() => handleArchive(opp.id)}
                                            disabled={isLoading}
                                            className="rounded-xl border border-stone-200 p-2 text-slate-500 hover:text-slate-700 disabled:opacity-40 dark:border-slate-700"
                                            title="Archive"
                                        >
                                            <Archive size={15} />
                                        </button>
                                    )}
                                    {(opp.status === "DRAFT" || opp.status === "ARCHIVED") && (
                                        <button
                                            onClick={() => handleDelete(opp.id)}
                                            disabled={isLoading}
                                            className="rounded-xl border border-stone-200 p-2 text-slate-500 hover:text-red-600 disabled:opacity-40 dark:border-slate-700"
                                            title="Delete permanently"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            </div>
            )}
        </div>
    );
}
