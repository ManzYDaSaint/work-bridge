"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Bookmark, Loader2, Trash2 } from "lucide-react";
import { PageHeader, EmptyState, Badge } from "@/components/dashboard/ui";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import JobDetailModal, { ExtendedJob } from "@/components/jobs/JobDetailModal";
import { ScreeningAnswer } from "@/types";

import { cn } from "@/lib/utils";

interface SavedJobEntry {
    id: string;
    job_id: string;
    job: ExtendedJob | null;
}

export default function SavedJobsPage() {
    const [savedEntries, setSavedEntries] = useState<SavedJobEntry[]>([]);
    const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState<ExtendedJob | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [savedRes, appsRes] = await Promise.all([apiFetch("/api/seeker/saved-jobs"), apiFetch("/api/applications")]);
                if (savedRes.ok) setSavedEntries(await savedRes.json());
                if (appsRes.ok) {
                    const apps = await appsRes.json();
                    setAppliedJobIds(new Set(apps.map((a: any) => a.jobId)));
                }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleRemove = async (jobId: string) => {
        try {
            const res = await apiFetch("/api/seeker/saved-jobs", { method: "POST", body: JSON.stringify({ jobId }) });
            if (res.ok) {
                setSavedEntries((prev) => prev.filter((s) => s.job_id !== jobId));
                router.refresh();
            }
        } catch {
            toast.error("Failed to remove saved job.");
        }
    };

    const handleApply = async (jobId: string, screeningAnswers?: Record<string, ScreeningAnswer>) => {
        try {
            const res = await apiFetch(`/api/jobs/${jobId}/apply`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ screeningAnswers: screeningAnswers || {} }),
            });
            if (res.ok) {
                setAppliedJobIds((prev) => new Set([...prev, jobId]));
                router.refresh();
                toast.success("Application sent.");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to apply");
            }
        } catch {
            toast.error("Failed to apply");
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
            <PageHeader title="Saved jobs" subtitle="A simple shortlist of roles you want to revisit." />

            {savedEntries.length === 0 ? (
                <div className="rounded-2xl border border-stone-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70">
                    <EmptyState icon={Bookmark} title="No saved jobs" description="Use the public board to bookmark roles for later." action={{ label: "Browse jobs", href: "/jobs" }} iconColor="text-[#16324f]" />
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="grid grid-cols-1 gap-2 border-b border-stone-200/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:border-slate-800 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
                        <span>Role</span>
                        <span>State</span>
                        <span className="sm:text-right">Action</span>
                    </div>
                    {savedEntries.map(({ id, job_id, job }) => (
                        <div key={id} className="grid grid-cols-1 gap-4 border-b border-stone-200/70 px-4 py-4 last:border-b-0 dark:border-slate-800 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-center">
                            <button
                                type="button"
                                onClick={() => job && setSelectedJob(job)}
                                className={cn("min-w-0 text-left", !job && "cursor-default")}
                                disabled={!job}
                            >
                                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                    {job?.title || "Job no longer active"}
                                </p>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    {job ? `${job.employer?.companyName || "Company"} · ${job.location}` : "This position has been filled or removed."}
                                </p>
                            </button>
                            <div className="flex items-center gap-2">
                                {job ? (
                                    appliedJobIds.has(job.id) ? (
                                        <Badge label="Applied" variant="green" />
                                    ) : (
                                        <Badge label="Saved" variant="secondary" />
                                    )
                                ) : (
                                    <Badge label="Inactive" variant="outline" />
                                )}
                            </div>
                            <div className="flex items-center gap-2 sm:justify-end">
                                {job && !appliedJobIds.has(job.id) && (
                                    <button onClick={() => setSelectedJob(job)} className="text-sm font-semibold text-[#16324f] hover:underline dark:text-slate-200">
                                        View
                                    </button>
                                )}
                                <button onClick={() => handleRemove(job_id)} className="rounded-xl border border-stone-200 p-2 text-slate-500 hover:text-red-600 dark:border-slate-700 dark:text-slate-300">
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
                    isSaved={true}
                    isApplied={appliedJobIds.has(selectedJob.id)}
                    onClose={() => setSelectedJob(null)}
                    onSave={() => handleRemove(selectedJob.id)}
                    onApply={(answers) => handleApply(selectedJob.id, answers)}
                />
            )}
        </div>
    );
}
