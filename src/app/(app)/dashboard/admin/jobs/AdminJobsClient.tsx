"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { PageHeader, Badge } from "@/components/dashboard/ui";
import { Briefcase, CheckCircle, XCircle, Trash2, Search, Eye, RefreshCw, Clock, AlertTriangle, FileText, Download, CalendarX } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import JobDetailModal from "@/components/jobs/JobDetailModal";

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
    return (
        <div className={`rounded-2xl border p-5 shadow-sm ${color}`}>
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
                {icon}
            </div>
            <p className="mt-2 text-3xl font-extrabold">{value}</p>
        </div>
    );
}

export default function AdminJobsClient({ 
    initialJobs, 
    initialTotal,
    initialSearchParams
}: { 
    initialJobs: any[]; 
    initialTotal: number;
    initialSearchParams: {
        page?: string;
        search?: string;
        status?: string;
    }
}) {
    const [actioning, setActioning] = useState<string | null>(null);
    const [selectedJob, setSelectedJob] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    const page = parseInt(searchParams.get("page") || initialSearchParams.page || "1");
    const searchTerm = searchParams.get("search") || initialSearchParams.search || "";
    const statusFilter = searchParams.get("status") || initialSearchParams.status || "ALL";
    const limit = 20;

    const handleRefresh = () => {
        setLoading(true);
        router.refresh();
        setTimeout(() => setLoading(false), 500);
    };

    const updateFilters = (updates: Record<string, string | number>) => {
        const params = new URLSearchParams(searchParams.toString());
        
        Object.entries(updates).forEach(([key, value]) => {
            if (value === "" || value === "ALL") {
                params.delete(key);
            } else {
                params.set(key, String(value));
            }
        });

        // Reset page to 1 when search or status changes
        if (!updates.page) {
            params.set("page", "1");
        }

        router.push(`/dashboard/admin/jobs?${params.toString()}`);
    };

    const handleDownloadCSV = async () => {
        toast.loading("Exporting jobs...");
        try {
            const res = await apiFetch(`/api/admin/jobs?page=1&limit=100000&search=${encodeURIComponent(searchTerm)}&status=${statusFilter}`);
            if (res.ok) {
                const data = await res.json();
                const headers = ["ID", "Title", "Company", "Status", "Created At"];
                const csvData = data.jobs.map((j: any) => [
                    j.id,
                    j.title ? `"${j.title.replace(/"/g, '""')}"` : "",
                    j.companyName ? `"${j.companyName.replace(/"/g, '""')}"` : "",
                    j.status,
                    j.createdAt
                ].join(","));
                const csvStr = [headers.join(","), ...csvData].join("\n");
                const blob = new Blob([csvStr], { type: "text/csv" });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `jobs_export_${new Date().toISOString().split("T")[0]}.csv`;
                a.click();
                toast.dismiss();
                toast.success("Export complete");
            }
        } catch {
            toast.dismiss();
            toast.error("Export failed");
        }
    };

    const handleStatusUpdate = async (jobId: string, status: string) => {
        setActioning(jobId);
        try {
            const res = await apiFetch("/api/admin/jobs", {
                method: "PATCH",
                body: JSON.stringify({ jobId, status }),
                headers: { "Content-Type": "application/json" },
            });
            if (res.ok) {
                router.refresh();
                toast.success(`Job status updated to ${status}.`);
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
                router.refresh();
                toast.success("Job deleted successfully.");
            } else {
                toast.error("Deletion failed.");
            }
        } finally {
            setActioning(null);
        }
    };

    const activeCount = initialJobs.filter(j => j.status === "ACTIVE").length;
    const pendingCount = initialJobs.filter(j => j.status === "PENDING").length;
    const rejectedCount = initialJobs.filter(j => j.status === "REJECTED").length;
    const expiredCount = initialJobs.filter(j => j.status === "EXPIRED").length;

    const tabs = [
        { key: "ALL", label: "All Listings", icon: <FileText size={14} /> },
        { key: "ACTIVE", label: "Active", icon: <CheckCircle size={14} /> },
        { key: "PENDING", label: "Pending Review", icon: <Clock size={14} /> },
        { key: "REJECTED", label: "Rejected", icon: <XCircle size={14} /> },
        { key: "EXPIRED", label: "Expired", icon: <CalendarX size={14} /> },
    ] as const;

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <PageHeader
                    title="Market Moderation"
                    subtitle="Moderate and manage all job listings across the marketplace."
                />
                <button 
                    onClick={handleRefresh} 
                    className="rounded-xl border border-stone-200 p-2 text-slate-400 hover:text-slate-700 dark:border-slate-700 dark:hover:text-slate-200"
                    title="Refresh jobs"
                >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                <StatCard 
                    label="Total Listings" 
                    value={initialTotal} 
                    icon={<Briefcase size={20} className="text-amber-500" />} 
                    color="border-amber-200 bg-amber-50/60 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100" 
                />
                <StatCard 
                    label="Active Jobs" 
                    value={activeCount} 
                    icon={<CheckCircle size={20} className="text-emerald-500" />} 
                    color="border-emerald-200 bg-emerald-50/60 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100" 
                />
                <StatCard 
                    label="Pending Review" 
                    value={pendingCount} 
                    icon={<Clock size={20} className="text-orange-500" />} 
                    color="border-orange-200 bg-orange-50/60 text-orange-900 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-100" 
                />
                <StatCard 
                    label="Rejected Jobs" 
                    value={rejectedCount} 
                    icon={<XCircle size={20} className="text-rose-500" />} 
                    color="border-rose-200 bg-rose-50/60 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100" 
                />
                <StatCard 
                    label="Expired Jobs" 
                    value={expiredCount} 
                    icon={<CalendarX size={20} className="text-purple-500" />} 
                    color="border-purple-200 bg-purple-50/60 text-purple-900 dark:border-purple-900/40 dark:bg-purple-950/30 dark:text-purple-100" 
                />
            </div>

            {/* Pending Alert Banner if any pending jobs */}
            {pendingCount > 0 && (
                <div className="flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/40 dark:bg-orange-950/30">
                    <AlertTriangle size={18} className="text-orange-500 shrink-0" />
                    <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                        {pendingCount} job listing(s) awaiting approval in the current view.
                    </p>
                </div>
            )}

            {/* Tabs Navigation & Search Toolbar */}
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800">
                    <div className="flex overflow-x-auto">
                        {tabs.map(t => (
                            <button
                                key={t.key}
                                onClick={() => updateFilters({ status: t.key })}
                                className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap ${
                                    statusFilter === t.key
                                        ? "border-amber-500 text-amber-600 dark:text-amber-400"
                                        : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                }`}
                            >
                                {t.icon} {t.label}
                            </button>
                        ))}
                    </div>

                    <button 
                        onClick={handleDownloadCSV} 
                        className="mb-2 inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 shrink-0"
                    >
                        <Download size={14} /> Export CSV
                    </button>
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search role or company name..."
                        value={searchTerm}
                        onChange={(e) => updateFilters({ search: e.target.value })}
                        className="w-full rounded-2xl border border-stone-200 bg-white px-12 py-3 text-sm outline-none focus:border-stone-300 dark:border-slate-700 dark:bg-slate-900"
                    />
                </div>
            </div>

            {/* Jobs Table */}
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-stone-100 px-5 py-3 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                        Job Listings <span className="ml-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">{initialJobs.length}</span>
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-2 border-b border-stone-100 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:border-slate-800 sm:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_auto]">
                    <span>Listing Details</span>
                    <span>Status</span>
                    <span className="sm:text-right">Actions</span>
                </div>

                {initialJobs.length === 0 ? (
                    <div className="p-12 text-center">
                        <Briefcase className="mx-auto text-slate-300 dark:text-slate-700" size={32} />
                        <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">No job listings found.</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try adjusting your search or tab filters.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-stone-100 dark:divide-slate-800">
                        {initialJobs.map((job) => (
                            <div key={job.id} className="grid grid-cols-1 gap-4 px-5 py-3.5 text-sm sm:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_auto] sm:items-center">
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">{job.title}</p>
                                    <p className="mt-0.5 text-[11px] text-slate-400">
                                        {job.companyName} · {job.location || "Location unlisted"}
                                        {job.deadline && (
                                            <span className="ml-2 inline-flex items-center gap-1 font-mono text-[10px] text-slate-400">
                                                (Deadline: {job.deadline})
                                            </span>
                                        )}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                        job.status === "ACTIVE"
                                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                            : job.status === "REJECTED"
                                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                            : job.status === "EXPIRED"
                                            ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                    }`}>
                                        {job.status}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 sm:justify-end">
                                    <button
                                        onClick={() => setSelectedJob(job)}
                                        className="rounded-xl border border-stone-200 p-2 text-slate-500 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300"
                                        title="View Details"
                                    >
                                        <Eye size={16} />
                                    </button>
                                    {job.status === "PENDING" && (
                                        <button
                                            onClick={() => handleStatusUpdate(job.id, "ACTIVE")}
                                            disabled={actioning === job.id}
                                            className="rounded-xl border border-stone-200 p-2 text-slate-500 hover:text-emerald-600 dark:border-slate-700 dark:text-slate-300"
                                            title="Approve Listing"
                                        >
                                            <CheckCircle size={16} />
                                        </button>
                                    )}
                                    {job.status !== "REJECTED" && (
                                        <button
                                            onClick={() => handleStatusUpdate(job.id, "REJECTED")}
                                            disabled={actioning === job.id}
                                            className="rounded-xl border border-stone-200 p-2 text-slate-500 hover:text-amber-600 dark:border-slate-700 dark:text-slate-300"
                                            title="Reject Listing"
                                        >
                                            <XCircle size={16} />
                                        </button>
                                    )}
                                    {job.status !== "EXPIRED" && (
                                        <button
                                            onClick={() => handleStatusUpdate(job.id, "EXPIRED")}
                                            disabled={actioning === job.id}
                                            className="rounded-xl border border-stone-200 p-2 text-slate-500 hover:text-purple-600 dark:border-slate-700 dark:text-slate-300"
                                            title="Expire Listing"
                                        >
                                            <CalendarX size={16} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(job.id)}
                                        disabled={actioning === job.id}
                                        className="rounded-xl border border-stone-200 p-2 text-slate-500 hover:text-red-600 dark:border-slate-700 dark:text-slate-300"
                                        title="Delete Listing"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {initialTotal > limit && (
                <div className="flex items-center justify-between mt-6 px-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Showing {(page - 1) * limit + 1} to {Math.min(page * limit, initialTotal)} of {initialTotal}
                    </p>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => updateFilters({ page: page - 1 })}
                            className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
                        >
                            Previous
                        </button>
                        <button
                            disabled={page * limit >= initialTotal}
                            onClick={() => updateFilters({ page: page + 1 })}
                            className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

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

