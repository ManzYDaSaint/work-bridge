"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Building2, CheckCircle, XCircle, Search, Loader2, ExternalLink, AlertTriangle } from "lucide-react";
import { PageHeader, Badge, Tabs } from "@/components/dashboard/ui";
import { toast } from "sonner";

export default function EmployerVerificationPage() {
    const [employers, setEmployers] = useState<any[]>([]);
    const [closeRequests, setCloseRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
    const [actioning, setActioning] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("employers");

    const fetchData = async () => {
        setLoading(true);
        try {
            const [empRes, closeRes] = await Promise.all([
                apiFetch("/api/admin/employers"),
                apiFetch("/api/admin/close-requests")
            ]);
            
            if (empRes.ok) setEmployers(await empRes.json());
            if (closeRes.ok) setCloseRequests(await closeRes.json());
        } catch {
            toast.error("Could not load data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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
                setEmployers((prev) => prev.map((e) => (e.id === employerId ? { ...e, status } : e)));
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
                setCloseRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
                toast.success(`Request marked as ${status.toLowerCase()}.`);
            } else {
                toast.error("Failed to update request.");
            }
        } finally {
            setActioning(null);
        }
    };

    const pendingCount = employers.filter((e) => e.status === "PENDING").length;
    const pendingCloseCount = closeRequests.filter((r) => r.status === "PENDING").length;

    const filteredEmployers = employers.filter((employer) => {
        const matchesSearch =
            employer.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (employer.industry && employer.industry.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === "ALL" || employer.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

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
                title="Employers"
                subtitle="Review company access and account closure requests."
            />

            <Tabs 
                activeTab={activeTab} 
                onChange={setActiveTab}
                tabs={[
                    { id: "employers", label: `All Employers ${pendingCount > 0 ? `(${pendingCount})` : ""}` },
                    { id: "close-requests", label: `Close Requests ${pendingCloseCount > 0 ? `(${pendingCloseCount})` : ""}` }
                ]}
            />

            {activeTab === "employers" ? (
                <>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search company or industry"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-2xl border border-stone-200 bg-white px-12 py-3 text-sm outline-none focus:border-stone-300 dark:border-slate-700 dark:bg-slate-900"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                        statusFilter === status
                                            ? "border-[#16324f] bg-[#16324f] text-white"
                                            : "border-stone-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                                    }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
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
                </>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="grid grid-cols-1 gap-2 border-b border-stone-200/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:border-slate-800 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
                        <span>Company</span>
                        <span>Request Details</span>
                        <span className="sm:text-right">Actions</span>
                    </div>

                    {closeRequests.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <CheckCircle className="mx-auto text-slate-300 dark:text-slate-700" size={32} />
                            <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">No close requests.</p>
                        </div>
                    ) : (
                        closeRequests.map((req) => (
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
