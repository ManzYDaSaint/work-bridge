"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Briefcase, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState, Badge } from "@/components/dashboard/ui";
import { useRouter } from "next/navigation";
import JobDetailModal, { ExtendedJob } from "@/components/jobs/JobDetailModal";

interface AppEntry {
    id: string;
    jobId: string;
    status: string;
    createdAt: string;
    job: ExtendedJob | null;
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
        setApplications((prev) => prev.filter((a) => a.id !== appId));
        try {
            const res = await apiFetch(`/api/applications/${appId}`, { method: "DELETE" });
            if (res.ok) {
                router.refresh();
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
                            <div className="flex items-center gap-2">
                                <Badge 
                                    label={app.status} 
                                    variant={
                                        app.status === "ACCEPTED" || app.status === "SHORTLISTED" ? "green" : 
                                        app.status === "INTERVIEWING" ? "blue" :
                                        app.status === "REJECTED" ? "red" : 
                                        "yellow"
                                    } 
                                />
                            </div>
                            <div className="flex items-center justify-between gap-3 sm:justify-end">
                                <button onClick={() => app.job && setSelectedJob(app.job)} className="text-sm font-semibold text-[#16324f] hover:underline dark:text-slate-200">
                                    View details
                                </button>
                                <button onClick={() => handleWithdraw(app.id)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-slate-500 hover:text-red-600 dark:border-slate-700 dark:text-slate-300">
                                    <Trash2 size={16} />
                                </button>
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
