"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { Badge, EmptyState } from "@/components/dashboard/ui";
import {
    Sparkles, RefreshCw, CheckCircle2, XCircle, ExternalLink,
    GraduationCap, Globe, Building2, Calendar, ShieldCheck, AlertTriangle
} from "lucide-react";

export default function OpportunityIngestionQueue() {
    const [queue, setQueue] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [crawling, setCrawling] = useState(false);
    const [actioningId, setActioningId] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [statusFilter, setStatusFilter] = useState("PENDING_REVIEW");

    const fetchQueue = async () => {
        setLoading(true);
        try {
            const res = await apiFetch(`/api/admin/opportunities/ingestion?status=${statusFilter}`);
            if (res.ok) {
                const data = await res.json();
                setQueue(data.queue || []);
            } else {
                toast.error("Failed to load ingestion queue.");
            }
        } catch {
            toast.error("Network error loading queue.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
    }, [statusFilter]);

    const handleForceCrawl = async () => {
        setCrawling(true);
        try {
            const res = await apiFetch("/api/admin/opportunities/ingestion", {
                method: "POST",
                body: JSON.stringify({}),
                headers: { "Content-Type": "application/json" },
            });
            if (res.ok) {
                const data = await res.json();
                toast.success(`Crawl completed! Found ${data.newCount || 0} new opportunities.`);
                fetchQueue();
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.error || "Crawl failed.");
            }
        } catch {
            toast.error("Network error during crawl.");
        } finally {
            setCrawling(false);
        }
    };

    const handleApprove = async (id: string) => {
        setActioningId(id);
        try {
            const res = await apiFetch(`/api/admin/opportunities/ingestion/${id}`, {
                method: "POST",
                body: JSON.stringify({ action: "approve" }),
                headers: { "Content-Type": "application/json" },
            });
            if (res.ok) {
                toast.success("Opportunity approved & published!");
                setSelectedItem(null);
                fetchQueue();
            } else {
                const err = await res.json();
                toast.error(err.error || "Approval failed.");
            }
        } finally {
            setActioningId(null);
        }
    };

    const handleReject = async (id: string) => {
        setActioningId(id);
        try {
            const res = await apiFetch(`/api/admin/opportunities/ingestion/${id}`, {
                method: "POST",
                body: JSON.stringify({ action: "reject", reason: "Admin rejected" }),
                headers: { "Content-Type": "application/json" },
            });
            if (res.ok) {
                toast.success("Opportunity rejected.");
                setSelectedItem(null);
                fetchQueue();
            } else {
                toast.error("Rejection failed.");
            }
        } finally {
            setActioningId(null);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header & Controls */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-stone-200 bg-stone-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Automated Opportunity Ingestion Queue
                        </h3>
                        <p className="text-xs text-slate-500">
                            Ingested from sources like ScholarshipTab. AI extracts funding, target regions, and deadlines for review.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex rounded-xl bg-stone-200/60 p-1 dark:bg-slate-800">
                        {["PENDING_REVIEW", "APPROVED", "REJECTED", "DUPLICATE", "ALL"].map((st) => (
                            <button
                                key={st}
                                onClick={() => setStatusFilter(st)}
                                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                                    statusFilter === st
                                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                                }`}
                            >
                                {st === "PENDING_REVIEW" ? "Pending" : st.replace("_", " ")}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleForceCrawl}
                        disabled={crawling}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#16324f] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#16324f]/90 disabled:opacity-50"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${crawling ? "animate-spin" : ""}`} />
                        {crawling ? "Crawling Feeds..." : "Run Ingestion Crawl"}
                    </button>
                </div>
            </div>

            {/* Queue Table */}
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                {loading ? (
                    <div className="flex items-center justify-center p-8 text-xs text-slate-400">
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading queue items...
                    </div>
                ) : queue.length === 0 ? (
                    <EmptyState
                        icon={Sparkles}
                        title="No ingested items in queue"
                        description="Click 'Run Ingestion Crawl' to fetch the latest opportunities from configured sources."
                    />
                ) : (
                    <div className="divide-y divide-stone-200/70 dark:divide-slate-800">
                        {queue.map((item) => {
                            const isSelected = selectedItem?.id === item.id;
                            const isActioning = actioningId === item.id;

                            return (
                                <div
                                    key={item.id}
                                    className={`p-4 transition-colors hover:bg-stone-50/70 dark:hover:bg-slate-800/40 ${
                                        isSelected ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                                    }`}
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    label={item.category.replace("_", " ")}
                                                    variant="blue"
                                                />
                                                <Badge
                                                    label={item.funding_type.replace("_", " ")}
                                                    variant="green"
                                                />
                                                {item.gender_eligibility === "WOMEN_ONLY" && (
                                                    <Badge label="Women Only" variant="yellow" />
                                                )}
                                                <span className="text-[11px] font-medium text-slate-400">
                                                    Source: {item.source?.name || "ScholarshipTab"}
                                                </span>
                                            </div>

                                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                                                {item.title}
                                            </h4>

                                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                                <span className="inline-flex items-center gap-1">
                                                    <Building2 className="h-3 w-3" /> {item.organization_name}
                                                </span>
                                                <span className="inline-flex items-center gap-1">
                                                    <Globe className="h-3 w-3" /> {item.country}
                                                </span>
                                                {item.deadline && (
                                                    <span className="inline-flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" /> Deadline: {item.deadline}
                                                    </span>
                                                )}
                                                <span className="inline-flex items-center gap-1 text-purple-600 font-medium">
                                                    <ShieldCheck className="h-3 w-3" /> AI Confidence: {item.overall_confidence}%
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setSelectedItem(isSelected ? null : item)}
                                                className="rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-stone-100 dark:border-slate-700 dark:text-slate-300"
                                            >
                                                {isSelected ? "Hide Review" : "Review Payload"}
                                            </button>

                                            {item.status === "PENDING_REVIEW" && (
                                                <>
                                                    <button
                                                        onClick={() => handleApprove(item.id)}
                                                        disabled={isActioning}
                                                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                                    >
                                                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve & Publish
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(item.id)}
                                                        disabled={isActioning}
                                                        className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30"
                                                    >
                                                        <XCircle className="h-3.5 w-3.5" /> Reject
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Split View Detail Drawer */}
                                    {isSelected && (
                                        <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-900/80 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                    Extracted AI Fields
                                                </h5>
                                                <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                                                    <p><strong>Funding Amount:</strong> {item.funding_amount || "Not specified"}</p>
                                                    <p><strong>Host Institutions:</strong> {item.host_institutions?.join(", ") || "None listed"}</p>
                                                    <p><strong>Target Regions:</strong> {item.target_regions?.join(", ") || "Global"}</p>
                                                    <p><strong>Eligibility:</strong> {item.eligibility_requirements || "Not specified"}</p>
                                                    <p><strong>Education Required:</strong> {item.education_requirements || "Not specified"}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                    Application Link & Overview
                                                </h5>
                                                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-4">
                                                    {item.description}
                                                </p>
                                                {item.application_url && (
                                                    <a
                                                        href={item.application_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                                                    >
                                                        View Official Webpage <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
