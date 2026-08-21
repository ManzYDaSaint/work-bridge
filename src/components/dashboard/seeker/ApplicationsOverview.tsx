"use client";

import { useState } from "react";
import { Briefcase } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState, Badge } from "@/components/dashboard/ui";
import { useRouter } from "next/navigation";
import JobDetailModal, { ExtendedJob } from "@/components/jobs/JobDetailModal";

interface AppEntry {
    id: string;
    jobId: string;
    status: string;
    createdAt: string;
    viewedAt?: string;
    job: ExtendedJob | null;
}

function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
}

export default function ApplicationsOverview({ applications }: { applications: AppEntry[] }) {
    const [selectedJob, setSelectedJob] = useState<ExtendedJob | null>(null);
    const [activeTab, setActiveTab] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const router = useRouter();

    const handleWithdraw = async (appId: string) => {
        if (!confirm("Are you sure you want to withdraw your application?")) return;
        try {
            const res = await fetch(`/api/applications/${appId}`, { method: "PATCH" });
            if (res.ok) {
                router.refresh();
                toast.success("Application withdrawn successfully.");
            } else {
                toast.error("Failed to withdraw application.");
            }
        } catch {
            toast.error("Failed to withdraw application.");
        }
    };

    const statusCounts = {
        ALL: applications.length,
        PENDING: applications.filter((a) => a.status === "PENDING").length,
        SHORTLISTED: applications.filter((a) => a.status === "SHORTLISTED").length,
        INTERVIEWING: applications.filter((a) => a.status === "INTERVIEWING").length,
        ACCEPTED: applications.filter((a) => a.status === "ACCEPTED").length,
        WITHDRAWN: applications.filter((a) => a.status === "WITHDRAWN").length,
    };

    const filteredApplications = applications.filter((app) => {
        const matchesTab = activeTab === "ALL" || app.status === activeTab;
        const query = searchQuery.toLowerCase();
        const title = app.job?.title?.toLowerCase() || "";
        const company = (app.job?.display_company_name || app.job?.employer?.companyName || "").toLowerCase();
        const matchesSearch = title.includes(query) || company.includes(query);
        return matchesTab && matchesSearch;
    });

    const tabs = [
        { id: "ALL", label: "All" },
        { id: "PENDING", label: "Pending" },
        { id: "SHORTLISTED", label: "Shortlisted" },
        { id: "INTERVIEWING", label: "Interviewing" },
        { id: "ACCEPTED", label: "Accepted" },
        { id: "WITHDRAWN", label: "Withdrawn" },
    ];

    return (
        <div className="space-y-6 pb-20">
            <PageHeader title="Applications" subtitle={`You have ${applications.length} active application${applications.length === 1 ? "" : "s"}.`} />

            {/* Status Tabs and Search Input */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-1.5 rounded-2xl bg-stone-100 p-1.5 dark:bg-slate-900 border border-stone-200/80 dark:border-slate-800">
                    {tabs.map((tab) => {
                        const count = statusCounts[tab.id as keyof typeof statusCounts] || 0;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                                    isActive
                                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${isActive ? "bg-stone-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200" : "bg-stone-200/60 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="relative min-w-[240px]">
                    <input
                        type="text"
                        placeholder="Search role or company..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-2xl border border-stone-200/80 bg-white px-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                </div>
            </div>

            {filteredApplications.length === 0 ? (
                <div className="rounded-2xl border border-stone-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70">
                    <EmptyState icon={Briefcase} title="No applications match" description="Try selecting a different status tab or clearing your search filter." action={{ label: "Browse jobs", href: "/jobs" }} iconColor="text-[#16324f]" />
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="hidden sm:grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] gap-2 border-b border-stone-200/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:border-slate-800">
                        <span>Role &amp; Company</span>
                        <span>Status &amp; Telemetry</span>
                        <span className="sm:text-right">Action</span>
                    </div>
                    {filteredApplications.map((app) => (
                        <div key={app.id} className="grid grid-cols-1 gap-4 border-b border-stone-200/70 px-4 py-4 last:border-b-0 dark:border-slate-800 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                            <button type="button" onClick={() => app.job && setSelectedJob(app.job)} className="min-w-0 text-left">
                                <p className="truncate text-sm font-bold text-slate-900 dark:text-white sm:text-base">{app.job?.title || "Unknown role"}</p>
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{app.job?.display_company_name || app.job?.employer?.companyName || "Company"}</p>
                            </button>
                            <div className="flex flex-col gap-1.5 items-start sm:items-center sm:flex-row sm:gap-2">
                                <Badge 
                                    label={app.status} 
                                    variant={
                                        app.status === "ACCEPTED" || app.status === "SHORTLISTED" ? "green" : 
                                        app.status === "INTERVIEWING" ? "blue" :
                                        app.status === "REJECTED" ? "red" : 
                                        app.status === "WITHDRAWN" ? "slate" :
                                        "yellow"
                                    } 
                                />
                                {app.viewedAt && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-300 px-2 py-0.5 rounded-md border border-sky-200/60 dark:border-sky-900/40">
                                        👀 Employer Viewed {formatTimeAgo(app.viewedAt)}
                                    </span>
                                )}
                                {app.createdAt && (
                                    <span className="text-xs font-medium text-slate-400">
                                        Applied {formatTimeAgo(app.createdAt)}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center justify-between gap-3 sm:justify-end">
                                <button onClick={() => app.job && setSelectedJob(app.job)} className="text-xs font-bold text-[#16324f] hover:underline dark:text-slate-200">
                                    View details →
                                </button>
                                {app.status !== "WITHDRAWN" && app.status !== "REJECTED" && (
                                    <button onClick={() => handleWithdraw(app.id)} className="flex h-8 items-center justify-center rounded-xl border border-stone-200 px-3 text-xs font-bold text-slate-500 hover:bg-stone-50 hover:text-rose-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900 transition">
                                        Withdraw
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedJob && (
                <JobDetailModal
                    job={selectedJob}
                    isSaved={false}
                    isApplied={true}
                    onClose={() => setSelectedJob(null)}
                    onSave={() => { }}
                    onApply={() => { }}
                />
            )}
        </div>
    );
}
