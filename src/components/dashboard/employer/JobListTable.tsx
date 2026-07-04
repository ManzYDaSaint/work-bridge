"use client";

import { useState } from "react";
import { Pencil, Trash2, RefreshCw, ArrowRightLeft, CheckCircle, Link as LinkIcon, BarChart2, Loader2 } from "lucide-react";
import { Badge } from "@/components/dashboard/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteJob, repostJob, closeJob } from "@/app/(app)/dashboard/employer/actions";
import RepostModal from "./RepostModal";
import { Job } from "@/types";

export default function JobListTable({ 
    initialJobs, 
    }: { 
        initialJobs: Job[]; 
        employerStatus?: string;
}) {
    const [jobs, setJobs] = useState<Job[]>(initialJobs);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [reposting, setReposting] = useState<string | null>(null);
    const [closing, setClosing] = useState<string | null>(null);
    const [repostJobId, setRepostJobId] = useState<string | null>(null);
    const router = useRouter();

    const handleDelete = async (jobId: string) => {
        if (!confirm("Delete this role? This cannot be undone.")) return;
        setDeleting(jobId);
        try {
            const result = await deleteJob(jobId);
            if (result.success) {
                setJobs((prev) => prev.filter((job) => job.id !== jobId));
                router.refresh();
                toast.success("Role deleted successfully.");
            } else {
                toast.error(result.error || "Failed to delete role.");
            }
        } catch (err) {
            console.error(err);
            toast.error("An unexpected error occurred.");
        } finally {
            setDeleting(null);
        }
    };

    const handleRepost = async (deadline: string) => {
        if (!repostJobId) return;
        setReposting(repostJobId);
        try {
            const result = await repostJob(repostJobId, deadline);
            if (result.success) {
                setRepostJobId(null);
                router.refresh();
                toast.success("Role reposted successfully.");
            } else {
                toast.error(result.error || "Failed to repost role.");
            }
        } catch (err) {
            console.error(err);
            toast.error("An unexpected error occurred.");
        } finally {
            setReposting(null);
        }
    };

    const handleCloseJob = async (jobId: string) => {
        if (!confirm("Mark this role as filled? It will be removed from the public board.")) return;
        setClosing(jobId);
        try {
            const result = await closeJob(jobId);
            if (result.success) {
                router.refresh();
                toast.success("Role marked as filled.");
            } else {
                toast.error(result.error || "Failed to close role.");
            }
        } catch (err) {
            console.error(err);
            toast.error("An unexpected error occurred.");
        } finally {
            setClosing(null);
        }
    };

    const handleCopyLink = (jobId: string) => {
        const url = `${window.location.origin}/jobs/${jobId}`;
        navigator.clipboard.writeText(url).then(() => {
            toast.success("Job link copied to clipboard!");
        }).catch(() => {
            toast.error("Failed to copy link.");
        });
    };

    return (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid grid-cols-1 gap-2 border-b border-stone-200/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:border-slate-800 sm:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_auto]">
                <span>Role</span>
                <span>Status</span>
                <span className="sm:text-right">Actions</span>
            </div>

            {jobs.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">
                    No roles found for this filter.
                </div>
            ) : (
                <>
                    {jobs.map((job) => (
                        <div key={job.id} className="grid grid-cols-1 gap-4 border-b border-stone-200/70 px-4 py-4 last:border-b-0 dark:border-slate-800 sm:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_auto] sm:items-center">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{job.title}</p>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    {job.location} · {job.type.replace(/_/g, " ")}
                                    {job.work_mode ? ` · ${job.work_mode.replace(/_/g, " ")}` : ""}
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <Badge label={job.status} variant={job.status === "ACTIVE" ? "green" : job.status === "FILLED" ? "blue" : "slate"} />
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {job._count?.applications || 0} applicants
                                    {job._count?.shortlisted ? ` (${job._count.shortlisted} shortlisted)` : ""}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 sm:justify-end">
                                {job.status === "EXPIRED" && (
                                    <button
                                        onClick={() => setRepostJobId(job.id)}
                                        disabled={reposting === job.id}
                                        className="rounded-xl border border-stone-200 p-2 text-slate-500 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300"
                                        title="Repost"
                                    >
                                        {reposting === job.id ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                    </button>
                                )}

                                {job.status === "ACTIVE" && (
                                    <button
                                        onClick={() => handleCopyLink(job.id)}
                                        className="rounded-xl border border-stone-200 p-2 text-slate-500 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300"
                                        title="Copy Link"
                                    >
                                        <LinkIcon size={16} />
                                    </button>
                                )}

                                {job.status === "ACTIVE" && (
                                    <button
                                        onClick={() => handleCloseJob(job.id)}
                                        disabled={closing === job.id}
                                        className="rounded-xl border border-stone-200 p-2 text-slate-500 hover:text-emerald-600 dark:border-slate-700 dark:text-slate-300"
                                        title="Mark as Filled"
                                    >
                                        {closing === job.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                    </button>
                                )}

                                <Link href={`/dashboard/employer/jobs/${job.id}/edit`} className="rounded-xl border border-stone-200 p-2 text-slate-500 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300" title="Edit">
                                    <Pencil size={16} />
                                </Link>
                                <button
                                    onClick={() => handleDelete(job.id)}
                                    disabled={deleting === job.id}
                                    className="rounded-xl border border-stone-200 p-2 text-slate-500 hover:text-red-600 dark:border-slate-700 dark:text-slate-300"
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <Link
                                    href={`/dashboard/employer/candidates?jobId=${job.id}`}
                                    className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                >
                                    Pipeline
                                    <ArrowRightLeft size={14} />
                                </Link>
                                <Link
                                    href={`/dashboard/employer/jobs/${job.id}`}
                                    className="inline-flex items-center gap-2 rounded-xl bg-[#16324f] px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
                                >
                                    Details
                                    <BarChart2 size={14} />
                                </Link>
                            </div>
                        </div>
                    ))}
                </>
            )}

            {repostJobId && (
                <RepostModal
                    onConfirm={handleRepost}
                    onClose={() => setRepostJobId(null)}
                    loading={reposting === repostJobId}
                />
            )}
        </div>
    );
}
