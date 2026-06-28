"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Briefcase, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState, Badge } from "@/components/dashboard/ui";
import { useRouter } from "next/navigation";
import JobDetailModal, { ExtendedJob } from "@/components/jobs/JobDetailModal";

interface AppEntry {
    id: string;
    jobId: string;
    status: string;
    createdAt: string;
    viewed_at?: string;
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

export default function ApplicationsPage() {
    const [applications, setApplications] = useState<AppEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState<ExtendedJob | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await apiFetch("/api/applications");
                if (res.ok) setApplications(await res.json());
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleWithdraw = async (appId: string) => {
        if (!confirm("Are you sure you want to withdraw your application?")) return;
        setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status: "WITHDRAWN" } : a));
        try {
            const res = await apiFetch(`/api/applications/${appId}`, { method: "PATCH" });
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

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#16324f]" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            <PageHeader title="Applications" subtitle={`You have ${applications.length} active application${applications.length === 1 ? "" : "s"}.`} />

            {applications.length === 0 ? (
                <div className="rounded-2xl border border-stone-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70">
                    <EmptyState icon={Briefcase} title="No applications yet" description="Browse the board and apply to roles that match your profile." action={{ label: "Browse jobs", href: "/jobs" }} iconColor="text-[#16324f]" />
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="hidden sm:grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] gap-2 border-b border-stone-200/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:border-slate-800">
                        <span>Role</span>
                        <span>Status</span>
                        <span className="sm:text-right">Action</span>
                    </div>
                    {applications.map((app) => (
                        <div key={app.id} className="grid grid-cols-1 gap-4 border-b border-stone-200/70 px-4 py-4 last:border-b-0 dark:border-slate-800 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                            <button type="button" onClick={() => app.job && setSelectedJob(app.job)} className="min-w-0 text-left">
                                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white sm:text-base">{app.job?.title || "Unknown role"}</p>
                                <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">{app.job?.employer?.companyName || "Company"}</p>
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
                                {app.viewed_at && app.status === "PENDING" && (
                                    <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                                        Viewed
                                    </span>
                                )}
                                {app.createdAt && (
                                    <span className="text-xs font-medium text-slate-400">
                                        Applied {formatTimeAgo(app.createdAt)}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center justify-between gap-3 sm:justify-end">
                                <button onClick={() => app.job && setSelectedJob(app.job)} className="text-sm font-semibold text-[#16324f] hover:underline dark:text-slate-200">
                                    View details
                                </button>
                                {app.status !== "WITHDRAWN" && (
                                    <button onClick={() => handleWithdraw(app.id)} className="flex h-9 items-center justify-center rounded-xl border border-stone-200 px-3 text-xs font-semibold text-slate-500 hover:bg-stone-50 hover:text-red-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900">
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
