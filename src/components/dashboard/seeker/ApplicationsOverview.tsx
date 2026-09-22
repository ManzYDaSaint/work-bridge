"use client";

import { useState, useMemo } from "react";
import { Briefcase, Eye, Clock, Building2, ChevronRight, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState, Badge, SearchInput, SegmentedFilterTabs } from "@/components/dashboard/ui";
import { useRouter } from "next/navigation";
import JobDetailModal, { ExtendedJob } from "@/components/jobs/JobDetailModal";
import ApplicationTimeline from "@/components/dashboard/ApplicationTimeline";

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

    const statusCounts = useMemo(() => ({
        ALL: applications.length,
        PENDING: applications.filter((a) => a.status === "PENDING").length,
        SHORTLISTED: applications.filter((a) => a.status === "SHORTLISTED").length,
        INTERVIEWING: applications.filter((a) => a.status === "INTERVIEWING").length,
        ACCEPTED: applications.filter((a) => a.status === "ACCEPTED").length,
        WITHDRAWN: applications.filter((a) => a.status === "WITHDRAWN").length,
    }), [applications]);

    const filteredApplications = useMemo(() => {
        return applications.filter((app) => {
            const matchesTab = activeTab === "ALL" || app.status === activeTab;
            const query = searchQuery.toLowerCase();
            const title = app.job?.title?.toLowerCase() || "";
            const company = (app.job?.display_company_name || app.job?.employer?.companyName || "").toLowerCase();
            const matchesSearch = title.includes(query) || company.includes(query);
            return matchesTab && matchesSearch;
        });
    }, [applications, activeTab, searchQuery]);

    const tabs = useMemo(() => [
        { id: "ALL", label: "All", count: statusCounts.ALL },
        { id: "PENDING", label: "Pending", count: statusCounts.PENDING },
        { id: "SHORTLISTED", label: "Shortlisted", count: statusCounts.SHORTLISTED },
        { id: "INTERVIEWING", label: "Interviewing", count: statusCounts.INTERVIEWING },
        { id: "ACCEPTED", label: "Accepted", count: statusCounts.ACCEPTED },
        { id: "WITHDRAWN", label: "Withdrawn", count: statusCounts.WITHDRAWN },
    ], [statusCounts]);

    const summaryCards = [
        { id: "PENDING", label: "Pending", value: statusCounts.PENDING, tone: "border-amber-200 bg-amber-50/50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300" },
        { id: "SHORTLISTED", label: "Shortlisted", value: statusCounts.SHORTLISTED, tone: "border-emerald-200 bg-emerald-50/50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300" },
        { id: "INTERVIEWING", label: "Interviewing", value: statusCounts.INTERVIEWING, tone: "border-sky-200 bg-sky-50/50 text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-300" },
        { id: "ACCEPTED", label: "Accepted", value: statusCounts.ACCEPTED, tone: "border-purple-200 bg-purple-50/50 text-purple-900 dark:border-purple-900/40 dark:bg-purple-950/20 dark:text-purple-300" },
    ];

    return (
        <div className="space-y-6 pb-20">
            <PageHeader title="Applications" subtitle={`Tracking ${applications.length} active application${applications.length === 1 ? "" : "s"} in your pipeline.`} />

            {/* Interactive Quick Stat Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {summaryCards.map((card) => (
                    <button
                        key={card.id}
                        onClick={() => setActiveTab(card.id)}
                        className={`flex flex-col justify-between rounded-3xl border p-4 text-left transition-all ${card.tone} ${
                            activeTab === card.id ? "ring-2 ring-[#16324f] dark:ring-amber-400" : "hover:opacity-90"
                        }`}
                    >
                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{card.label}</p>
                        <p className="mt-1 text-2xl font-black tracking-tight">{card.value}</p>
                    </button>
                ))}
            </div>

            {/* Controls Row: Status Tabs + Search */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <SegmentedFilterTabs
                    tabs={tabs}
                    activeTab={activeTab}
                    onChange={(id) => setActiveTab(id)}
                />

                <SearchInput
                    value={searchQuery}
                    onChange={(val) => setSearchQuery(val)}
                    placeholder="Search role or company..."
                />
            </div>

            {/* Application Cards Feed */}
            {filteredApplications.length === 0 ? (
                <div className="rounded-3xl border border-stone-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                    {applications.length === 0 ? (
                        <EmptyState 
                            icon={Briefcase} 
                            title="No applications yet" 
                            description="Start applying to jobs in your recommended feed to track your status and progress here." 
                            action={{ label: "View Recommendations", href: "/dashboard/seeker/recommendations" }} 
                            iconColor="text-[#16324f]" 
                        />
                    ) : (
                        <EmptyState 
                            icon={Briefcase} 
                            title="No applications match" 
                            description="Try selecting a different status tab or clearing your search filter." 
                            action={{ label: "Clear Filters", onClick: () => { setActiveTab("ALL"); setSearchQuery(""); } }} 
                            iconColor="text-[#16324f]" 
                        />
                    )}
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {filteredApplications.map((app) => {
                        const companyName = app.job?.display_company_name || app.job?.employer?.companyName || "Company";

                        return (
                            <div
                                key={app.id}
                                className="group flex flex-col justify-between rounded-3xl border border-stone-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:border-stone-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 space-y-4"
                            >
                                <div className="space-y-3">
                                    {/* Status Badge & Telemetry Bar */}
                                    <div className="flex flex-wrap items-center justify-between gap-2">
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
                                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200/50 dark:border-sky-900/40">
                                                <Eye size={11} /> Employer Viewed {formatTimeAgo(app.viewedAt)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Role Title & Company */}
                                    <div>
                                        <h3
                                            onClick={() => app.job && setSelectedJob(app.job)}
                                            className="cursor-pointer text-base font-bold text-slate-900 line-clamp-1 group-hover:text-[#16324f] dark:text-white dark:group-hover:text-amber-400 transition-colors"
                                        >
                                            {app.job?.title || "Unknown Role"}
                                        </h3>
                                        <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                                            <Building2 size={12} className="shrink-0" />
                                            <span>{companyName}</span>
                                        </p>
                                    </div>

                                    {/* Applied Time Meta */}
                                    {app.createdAt && (
                                        <p className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                                            <Clock size={11} /> Applied {formatTimeAgo(app.createdAt)}
                                        </p>
                                    )}

                                    {/* Application Progress Timeline */}
                                    <div className="pt-1">
                                        <ApplicationTimeline applicationId={app.id} currentStatus={app.status} />
                                    </div>
                                </div>

                                {/* Action Bar */}
                                <div className="flex items-center justify-between border-t border-stone-100 pt-3 dark:border-slate-800">
                                    <button
                                        onClick={() => app.job && setSelectedJob(app.job)}
                                        className="inline-flex items-center gap-1 text-xs font-bold text-[#16324f] hover:underline dark:text-amber-400"
                                    >
                                        View Job Details <ChevronRight size={13} />
                                    </button>

                                    {app.status !== "WITHDRAWN" && app.status !== "REJECTED" && (
                                        <button
                                            onClick={() => handleWithdraw(app.id)}
                                            className="inline-flex items-center gap-1 rounded-xl border border-stone-200 px-3 py-1 text-xs font-semibold text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-800 dark:text-slate-400 dark:hover:border-rose-900 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition"
                                        >
                                            <XCircle size={12} /> Withdraw
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
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

