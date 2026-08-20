"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Building2, CheckCircle, XCircle, Search, Loader2, ExternalLink } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader, Badge, Tabs } from "@/components/dashboard/ui";
import { toast } from "sonner";

export default function EmployerVerificationClient({ 
    initialEmployers, 
    initialCloseRequests,
    initialSearchParams
}: { 
    initialEmployers: any[]; 
    initialCloseRequests: any[];
    initialSearchParams: {
        tab?: string;
        search?: string;
        status?: string;
    }
}) {
    const [actioning, setActioning] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();

    const activeTab = searchParams.get("tab") || initialSearchParams.tab || "employers";
    const searchTerm = searchParams.get("search") || initialSearchParams.search || "";
    const statusFilter = (searchParams.get("status") || initialSearchParams.status) as "ALL" | "PENDING" | "APPROVED" | "REJECTED" || "PENDING";

    const updateFilters = (updates: Record<string, string | number>) => {
        const params = new URLSearchParams(searchParams.toString());
        
        Object.entries(updates).forEach(([key, value]) => {
            if (value === "" || value === "ALL") {
                params.delete(key);
            } else {
                params.set(key, String(value));
            }
        });

        router.push(`/dashboard/admin/employers?${params.toString()}`);
    };

    const handleStatusUpdate = async (employerId: string, status: string) => {
        setActioning(employerId);
        try {
            const res = await apiFetch("/api/admin/employers", {
                method: "PATCH",
                body: JSON.stringify({
                    employerId,
                    status,
                    notes: `Updated to ${status} by admin.`,
                }),
                headers: { "Content-Type": "application/json" },
            });
            if (res.ok) {
                router.refresh();
                toast.success(`Employer ${status.toLowerCase()} successfully.`);
            } else {
                toast.error("Status change failed.");
            }
        } finally {
            setActioning(null);
        }
    };

    const handleCloseRequestStatus = async (id: string, status: string) => {
        setActioning(id);
        try {
            const res = await apiFetch("/api/admin/close-requests", {
                method: "PATCH",
                body: JSON.stringify({ id, status }),
                headers: { "Content-Type": "application/json" },
            });
            if (res.ok) {
                router.refresh();
                toast.success(`Request marked as ${status.toLowerCase()}.`);
            } else {
                toast.error("Failed to update request.");
            }
        } finally {
            setActioning(null);
        }
    };

    const pendingCount = initialEmployers.filter((e) => e.status === "PENDING").length;
    const pendingCloseCount = initialCloseRequests.filter((r) => r.status === "PENDING").length;

    const filteredEmployers = initialEmployers.filter((employer) => {
        const matchesSearch =
            employer.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (employer.industry && employer.industry.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === "ALL" || !statusFilter || employer.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Employers"
                subtitle="Review company access and account closure requests."
            />

            {/* Main Tabs Navigation */}
            <div className="flex border-b border-stone-200 dark:border-slate-800">
                <button
                    onClick={() => updateFilters({ tab: "employers" })}
                    className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                        activeTab === "employers"
                            ? "border-amber-500 text-amber-600 dark:text-amber-400"
                            : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
                    }`}
                >
                    <Building2 size={14} /> All Employers {pendingCount > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">{pendingCount}</span>}
                </button>
                <button
                    onClick={() => updateFilters({ tab: "close-requests" })}
                    className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                        activeTab === "close-requests"
                            ? "border-amber-500 text-amber-600 dark:text-amber-400"
                            : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
                    }`}
                >
                    <XCircle size={14} /> Close Requests {pendingCloseCount > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800 dark:bg-red-950 dark:text-red-300 font-bold">{pendingCloseCount}</span>}
                </button>
            </div>

            {activeTab === "employers" ? (
                <div className="space-y-4">
                    {/* Status Filter Tabs & Search */}
                    <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800">
                        <div className="flex overflow-x-auto">
                            {[
                                { key: "ALL", label: "All Statuses" },
                                { key: "PENDING", label: "Pending Review", count: pendingCount },
                                { key: "APPROVED", label: "Approved" },
                                { key: "REJECTED", label: "Rejected" },
                            ].map((s) => (
                                <button
                                    key={s.key}
                                    onClick={() => updateFilters({ status: s.key })}
                                    className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                                        statusFilter === s.key
                                            ? "border-amber-500 text-amber-600 dark:text-amber-400 font-bold"
                                            : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                    }`}
                                >
                                    {s.label} {s.count !== undefined && s.count > 0 && <span className="rounded-full bg-stone-100 px-1.5 text-[11px] dark:bg-slate-800">{s.count}</span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search company or industry..."
                            value={searchTerm}
                            onChange={(e) => updateFilters({ search: e.target.value })}
                            className="w-full rounded-2xl border border-stone-200 bg-white px-12 py-3 text-sm outline-none focus:border-stone-300 dark:border-slate-700 dark:bg-slate-900"
                        />
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70">
                        <div className="grid grid-cols-1 gap-2 border-b border-stone-200/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:border-slate-800 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
                            <span>Employer</span>
                            <span>Status</span>
                            <span className="sm:text-right">Actions</span>
                        </div>

                        {filteredEmployers.length === 0 ? (
                            <div className="px-6 py-16 text-center">
                                <Building2 className="mx-auto text-slate-300 dark:text-slate-700" size={32} />
                                <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">No matching employers.</p>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try another search or status filter.</p>
                            </div>
                        ) : (
                            filteredEmployers.map((employer) => (
                                <div key={employer.id} className="grid grid-cols-1 gap-4 border-b border-stone-200/70 px-4 py-4 last:border-b-0 dark:border-slate-800 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-center">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{employer.companyName}</p>
                                            {employer.website && (
                                                <a href={employer.website} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                                                    <ExternalLink size={14} />
                                                </a>
                                            )}
                                        </div>
                                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                            {employer.industry || "Unspecified industry"} · {employer.location || "No location"}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Badge label={employer.status} variant={employer.status === "APPROVED" ? "green" : employer.status === "REJECTED" ? "red" : "yellow"} />
                                    </div>

                                    <div className="flex items-center gap-2 sm:justify-end">
                                        {employer.status !== "APPROVED" && (
                                            <button
                                                onClick={() => handleStatusUpdate(employer.id, "APPROVED")}
                                                disabled={actioning === employer.id}
                                                className="rounded-xl border border-stone-200 p-2 text-slate-500 hover:text-emerald-600 dark:border-slate-700 dark:text-slate-300"
                                                title="Approve employer"
                                            >
                                                {actioning === employer.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                            </button>
                                        )}
                                        {employer.status !== "REJECTED" && (
                                            <button
                                                onClick={() => handleStatusUpdate(employer.id, "REJECTED")}
                                                disabled={actioning === employer.id}
                                                className="rounded-xl border border-stone-200 p-2 text-slate-500 hover:text-red-600 dark:border-slate-700 dark:text-slate-300"
                                                title="Reject employer"
                                            >
                                                <XCircle size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="grid grid-cols-1 gap-2 border-b border-stone-200/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:border-slate-800 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
                        <span>Company</span>
                        <span>Request Details</span>
                        <span className="sm:text-right">Actions</span>
                    </div>

                    {initialCloseRequests.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <CheckCircle className="mx-auto text-slate-300 dark:text-slate-700" size={32} />
                            <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">No close requests.</p>
                        </div>
                    ) : (
                        initialCloseRequests.map((req) => (
                            <div key={req.id} className="grid grid-cols-1 gap-4 border-b border-stone-200/70 px-4 py-4 last:border-b-0 dark:border-slate-800 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] sm:items-start">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{req.company_name || "Unknown Company"}</p>
                                    <p className="mt-1 text-xs text-slate-500">{new Date(req.created_at).toLocaleDateString()}</p>
                                    <div className="mt-2">
                                        <Badge label={req.status} variant={req.status === "REVIEWED" ? "blue" : req.status === "ACTIONED" ? "green" : "yellow"} />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Reasons</p>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {req.reasons.map((r: string, idx: number) => (
                                                <span key={idx} className="rounded-lg bg-stone-100 px-2 py-1 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                    {r}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    {req.additional_notes && (
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Notes</p>
                                            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400 italic">
                                                &quot;{req.additional_notes}&quot;
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 sm:justify-end pt-1">
                                    {req.status === "PENDING" && (
                                        <button
                                            onClick={() => handleCloseRequestStatus(req.id, "REVIEWED")}
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                        >
                                            Mark Reviewed
                                        </button>
                                    )}
                                    {req.status !== "ACTIONED" && (
                                        <button
                                            onClick={() => handleCloseRequestStatus(req.id, "ACTIONED")}
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/30"
                                        >
                                            Mark Actioned
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
