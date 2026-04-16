"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { PageHeader, Badge } from "@/components/dashboard/ui";
import { Briefcase, CheckCircle, XCircle, Trash2, Search, Loader2, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import JobDetailModal from "@/components/jobs/JobDetailModal";

export default function AdminJobsPage() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [actioning, setActioning] = useState<string | null>(null);
    const [selectedJob, setSelectedJob] = useState<any | null>(null);
    const router = useRouter();

    const fetchJobs = async () => {
        try {
            const res = await apiFetch("/api/admin/jobs");
            if (res.ok) setJobs(await res.json());
        } catch {
            toast.error("Could not load jobs.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    const handleStatusUpdate = async (jobId: string, status: string) => {
        setActioning(jobId);
        try {
            const res = await apiFetch("/api/admin/jobs", {
                method: "PATCH",
                body: JSON.stringify({ jobId, status }),
                headers: { "Content-Type": "application/json" },
            });
            if (res.ok) {
                setJobs((prev) => prev.map((job) => (job.id === jobId ? { ...job, status } : job)));
                router.refresh();
            } else {
                toast.error("Status update failed.");
            }
        } finally {
            setActioning(null);
        }
    };

    const handleDelete = async (jobId: string) => {
        if (!confirm("Delete this listing?")) return;

        setActioning(jobId);
        try {
            const res = await apiFetch(`/api/admin/jobs?jobId=${jobId}`, { method: "DELETE" });
            if (res.ok) {
                setJobs((prev) => prev.filter((job) => job.id !== jobId));
                router.refresh();
            } else {
                toast.error("Deletion failed.");
            }
        } finally {
            setActioning(null);
        }
    };

    const filteredJobs = jobs.filter((job) =>
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#16324f]" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Review jobs"
                subtitle="Moderate the marketplace with a clean, searchable listing view."
            />

            <div className="relative max-w-xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Search role or company"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-2xl border border-stone-200 bg-white px-12 py-3 text-sm outline-none focus:border-stone-300 dark:border-slate-700 dark:bg-slate-900"
                />
            </div>

            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="grid grid-cols-1 gap-2 border-b border-stone-200/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:border-slate-800 sm:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_auto]">
                    <span>Listing</span>
                    <span>Status</span>
                    <span className="sm:text-right">Actions</span>
                </div>

                {filteredJobs.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <Briefcase className="mx-auto text-slate-300 dark:text-slate-700" size={32} />
                        <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">No matching jobs.</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try a different search term.</p>
                    </div>
                ) : (
                    filteredJobs.map((job) => (
                        <div key={job.id} className="grid grid-cols-1 gap-4 border-b border-stone-200/70 px-4 py-4 last:border-b-0 dark:border-slate-800 sm:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_auto] sm:items-center">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{job.title}</p>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    {job.companyName} · {job.location}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <Badge label={job.status} variant={job.status === "ACTIVE" ? "green" : job.status === "REJECTED" ? "red" : "slate"} />
                            </div>

                            <div className="flex items-center gap-2 sm:justify-end">
                                <button
                                    onClick={() => setSelectedJob(job)}
                                    className="rounded-xl border border-stone-200 p-2 text-slate-500 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300"
                                    title="View"
                                >
                                    <Eye size={16} />
                                </button>
                                {job.status !== "REJECTED" && (
                                    <button
                                        onClick={() => handleStatusUpdate(job.id, "REJECTED")}
                                        disabled={actioning === job.id}
                                        className="rounded-xl border border-stone-200 p-2 text-slate-500 hover:text-amber-600 dark:border-slate-700 dark:text-slate-300"
                                        title="Reject"
                                    >
                                        <XCircle size={16} />
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDelete(job.id)}
                                    disabled={actioning === job.id}
                                    className="rounded-xl border border-stone-200 p-2 text-slate-500 hover:text-red-600 dark:border-slate-700 dark:text-slate-300"
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {selectedJob && (
                <JobDetailModal
                    job={selectedJob}
                    isSaved={false}
                    isApplied={false}
                    publicMode={true}
                    publicViewerMode="admin"
                    onClose={() => setSelectedJob(null)}
                    onSave={() => {}}
                    onApply={() => {}}
                />
            )}
        </div>
    );
}
