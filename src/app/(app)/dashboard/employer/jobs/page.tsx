"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { User, Job, Employer } from "@/types";
import { Briefcase, PlusCircle, Loader2, Pencil, Trash2, RefreshCw, ArrowRightLeft, Lock, CheckCircle, Link as LinkIcon, BarChart2 } from "lucide-react";
import { PageHeader, EmptyState, Badge, Tabs, Pagination } from "@/components/dashboard/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function EmployerJobsPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [employerProfile, setEmployerProfile] = useState<Employer | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [reposting, setReposting] = useState<string | null>(null);
    const [closing, setClosing] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const router = useRouter();

    const fetchJobs = async (tab: string, page: number) => {
        setLoading(true);
        try {
            const res = await apiFetch(`/api/jobs/my-jobs?status=${tab}&page=${page}&limit=8`);
            if (res.ok) {
                const data = await res.json();
                setJobs(data.jobs);
                setTotalPages(data.totalPages);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs(activeTab, currentPage);
    }, [activeTab, currentPage]);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await apiFetch("/api/me");
                if (res.ok) {
                    const data: User = await res.json();
                    if (data.role !== "EMPLOYER") {
                        router.push("/dashboard");
                    } else {
                        setEmployerProfile(data.employer ?? null);
                    }
                } else {
                    router.push("/login");
                }
            } catch {
                router.push("/login");
            }
        };
        fetchUser();
    }, [router]);

    const handleDelete = async (jobId: string) => {
        if (!confirm("Delete this role? This cannot be undone.")) return;
        setDeleting(jobId);
        try {
            const res = await apiFetch(`/api/jobs/${jobId}`, { method: "DELETE" });
            if (res.ok) {
                setJobs((prev) => prev.filter((job) => job.id !== jobId));
                router.refresh();
            }
        } finally {
            setDeleting(null);
        }
    };

    const handleRepost = async (jobId: string) => {
        const newDeadline = prompt(
            "Enter a new deadline (YYYY-MM-DD):",
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
        );
        if (!newDeadline) return;

        setReposting(jobId);
        try {
            const res = await apiFetch(`/api/jobs/${jobId}`, {
                method: "POST",
                body: JSON.stringify({ deadline: newDeadline }),
            });
            if (res.ok) {
                fetchJobs(activeTab, currentPage);
                router.refresh();
            }
        } finally {
            setReposting(null);
        }
    };

    const handleCloseJob = async (jobId: string) => {
        if (!confirm("Mark this role as filled? It will be removed from the public board.")) return;
        setClosing(jobId);
        try {
            const res = await apiFetch(`/api/jobs/${jobId}`, {
                method: "PATCH",
                body: JSON.stringify({ status: "FILLED" }),
            });
            if (res.ok) {
                fetchJobs(activeTab, currentPage);
                router.refresh();
            }
        } finally {
            setClosing(null);
        }
    };

    const handleCopyLink = (jobId: string) => {
        const url = `${window.location.origin}/jobs/${jobId}`;
        navigator.clipboard.writeText(url);
        // Optional: you could add a tiny toast here if you have sonner/toast imported
        // toast.success("Link copied!");
    };

    const isApproved = employerProfile?.status === "APPROVED";
    const tabs = [
        { id: "all", label: "All" },
        { id: "ACTIVE", label: "Active" },
        { id: "EXPIRED", label: "Expired" },
        { id: "FILLED", label: "Filled" },
    ];

    if (loading && jobs.length === 0) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#16324f]" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Manage roles"
                subtitle="A faster role list with clear status, quick edits, and fewer clicks."
                action={
                    isApproved
                        ? { label: "Post role", icon: PlusCircle, href: "/dashboard/employer/jobs/new" }
                        : { label: "Pending approval", icon: Lock, href: "/dashboard/employer", disabled: true }
                }
            />

            <Tabs
                tabs={tabs}
                activeTab={activeTab}
                onChange={(id) => {
                    setActiveTab(id);
                    setCurrentPage(1);
                }}
            />

            {jobs.length === 0 ? (
                <div className="rounded-2xl border border-stone-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70">
                    <EmptyState
                        icon={Briefcase}
                        title={activeTab === "all" ? "No roles yet" : `No ${activeTab.toLowerCase()} roles`}
                        description="Keep this area focused on active hiring. Add a role when you're ready."
                        action={isApproved && activeTab === "all" ? { label: "Post a role", href: "/dashboard/employer/jobs/new" } : undefined}
                        iconColor="text-[#16324f]"
                    />
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="grid grid-cols-1 gap-2 border-b border-stone-200/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:border-slate-800 sm:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_auto]">
                        <span>Role</span>
                        <span>Status</span>
                        <span className="sm:text-right">Actions</span>
                    </div>

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
                                        onClick={() => handleRepost(job.id)}
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
                                    {deleting === job.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
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
                </div>
            )}

            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
    );
}
