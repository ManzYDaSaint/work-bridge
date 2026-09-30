"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { PageHeader, Badge } from "@/components/dashboard/ui";
import { 
    CheckCircle2, XCircle, ShieldCheck, Zap, RefreshCw, Loader2, 
    Send, Sparkles, AlertCircle, Building2, User, Phone, BookOpen, Clock, Layers, MessageSquare, Mail
} from "lucide-react";
import { toast } from "sonner";

export default function NotificationReviewClient() {
    const [loading, setLoading] = useState(true);
    const [triggeringMatching, setTriggeringMatching] = useState(false);
    const [dispatches, setDispatches] = useState<any[]>([]);
    const [stats, setStats] = useState({ totalDispatched: 0, sentCount: 0, pendingCount: 0, failedCount: 0, whatsappCount: 0, emailCount: 0 });
    const [diagnostics, setDiagnostics] = useState<any>({ activeJobs: 0, activeSeekers: 0, premiumSeekers: 0 });
    const [filterTier, setFilterTier] = useState<"ALL" | "WHATSAPP" | "EMAIL">("ALL");

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await apiFetch("/api/admin/notifications");
            if (res.ok) {
                const data = await res.json();
                setDispatches(data.dispatches || []);
                setStats({
                    totalDispatched: data.totalDispatched || 0,
                    sentCount: data.sentCount || 0,
                    pendingCount: data.pendingCount || 0,
                    failedCount: data.failedCount || 0,
                    whatsappCount: data.whatsappCount || 0,
                    emailCount: data.emailCount || 0,
                });
                if (data.diagnostics) setDiagnostics(data.diagnostics);
            } else {
                toast.error("Failed to load dispatched matches");
            }
        } catch {
            toast.error("Network error fetching dispatched matches");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleTriggerMatchingNow = async () => {
        setTriggeringMatching(true);
        try {
            const res = await apiFetch("/api/admin/notifications", {
                method: "POST",
                body: JSON.stringify({ action: "TRIGGER_MATCHING" })
            });

            if (res.ok) {
                toast.success("Matching & automated dispatch triggered — refreshing in ~6s...");
                setTimeout(() => fetchData(), 6000);
            } else {
                toast.error("Failed to start matching routine");
            }
        } catch {
            toast.error("Network error starting matching routine");
        } finally {
            setTriggeringMatching(false);
        }
    };

    const handleRequeue = async (id: string) => {
        try {
            const res = await apiFetch("/api/admin/notifications", {
                method: "POST",
                body: JSON.stringify({ action: "REQUEUE", notificationId: id })
            });
            if (res.ok) {
                toast.success("Match re-queued for delivery retry!");
                fetchData();
            } else {
                toast.error("Failed to requeue match");
            }
        } catch {
            toast.error("Network error");
        }
    };

    const filteredDispatches = dispatches.filter(item => {
        const isEmail = item.template_id === "standard_email_job_alert" || (item.payload as any)?.channel === "EMAIL";
        if (filterTier === "WHATSAPP") return !isEmail;
        if (filterTier === "EMAIL") return isEmail;
        return true;
    });

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Dispatched Job Matches & Delivery Audit"
                subtitle="Fully automated two-tier dispatch: Instant WhatsApp alerts for Premium Seekers and 24-Hour delayed Email alerts for Free Plan Seekers."
            />

            {/* Telemetry Stats Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                <div className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-[11px] font-semibold uppercase text-slate-400">Total Dispatched</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{stats.totalDispatched}</p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-[11px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">Sent Success</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.sentCount}</p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-[11px] font-semibold uppercase text-amber-600 dark:text-amber-400">Premium WhatsApp</p>
                    <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.whatsappCount}</p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-[11px] font-semibold uppercase text-blue-600 dark:text-blue-400">Free 24h Email</p>
                    <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.emailCount}</p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-[11px] font-semibold uppercase text-red-500">Failed / Errors</p>
                    <p className="mt-1 text-2xl font-bold text-red-500">{stats.failedCount}</p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase text-slate-400">Matching Engine</p>
                        <button
                            onClick={handleTriggerMatchingNow}
                            disabled={triggeringMatching}
                            className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {triggeringMatching ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            Run Run
                        </button>
                    </div>
                </div>
            </div>

            {/* Filter Tabs & Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setFilterTier("ALL")}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition ${filterTier === "ALL" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-stone-100 text-slate-600 hover:bg-stone-200 dark:bg-slate-800 dark:text-slate-300"}`}
                    >
                        All Dispatches ({stats.totalDispatched})
                    </button>
                    <button
                        onClick={() => setFilterTier("WHATSAPP")}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 ${filterTier === "WHATSAPP" ? "bg-emerald-600 text-white" : "bg-stone-100 text-slate-600 hover:bg-stone-200 dark:bg-slate-800 dark:text-slate-300"}`}
                    >
                        <MessageSquare size={13} /> Premium WhatsApp ({stats.whatsappCount})
                    </button>
                    <button
                        onClick={() => setFilterTier("EMAIL")}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 ${filterTier === "EMAIL" ? "bg-blue-600 text-white" : "bg-stone-100 text-slate-600 hover:bg-stone-200 dark:bg-slate-800 dark:text-slate-300"}`}
                    >
                        <Mail size={13} /> Free 24h Email ({stats.emailCount})
                    </button>
                </div>
                <button
                    onClick={fetchData}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                    <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            {/* Dispatches List / Table */}
            <div className="rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                <div className="border-b border-stone-200 px-6 py-4 dark:border-slate-800">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Dispatched Match Audit Log</h3>
                    <p className="text-xs text-slate-500">Inspecting match preciseness scores, domain classifications, and delivery statuses.</p>
                </div>

                {loading ? (
                    <div className="flex h-48 items-center justify-center">
                        <Loader2 className="animate-spin text-amber-500" size={28} />
                    </div>
                ) : filteredDispatches.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <CheckCircle2 size={48} className="text-emerald-500 mb-3" />
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">No Dispatched Matches Found</h4>
                        <p className="text-xs text-slate-500 mt-1">Dispatched alerts for premium WhatsApp and free 24h email will appear here automatically.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-stone-200 dark:divide-slate-800">
                        {filteredDispatches.map((item: any) => {
                            const isEmail = item.template_id === "standard_email_job_alert" || (item.payload as any)?.channel === "EMAIL";
                            const matchScore = item.payload?.matchScore || item.payload?._scoring?.finalScore || 0;
                            const company = item.payload?.company || item.jobs?.display_company_name || "Employer";
                            const jobTitle = item.jobs?.title || item.payload?.jobTitle || "Job Opportunity";
                            const seekerName = item.job_seekers?.full_name || item.payload?.seekerName || "Job Seeker";
                            const phoneOrEmail = item.job_seekers?.phone || item.payload?.email || "N/A";

                            return (
                                <div key={item.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-stone-50/60 dark:hover:bg-slate-800/40 transition">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-[11px] font-bold ${isEmail ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"}`}>
                                                {isEmail ? <Mail size={11} /> : <MessageSquare size={11} />}
                                                {isEmail ? "Free (24h Email)" : "Premium (Instant WhatsApp)"}
                                            </span>
                                            <Badge label={`Match Score: ${matchScore}%`} variant={matchScore >= 80 ? "green" : matchScore >= 60 ? "yellow" : "slate"} />
                                            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${item.status === "SENT" ? "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800" : item.status === "PENDING" ? "bg-amber-50 text-amber-600 border border-amber-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                                                {item.status}
                                            </span>
                                        </div>

                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">{jobTitle}</h4>
                                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                                Company: <strong className="text-slate-900 dark:text-white">{company}</strong> • Seeker: <strong className="text-slate-900 dark:text-white">{seekerName}</strong> ({phoneOrEmail})
                                            </p>
                                        </div>

                                        {item.payload?.resolvedQual && (
                                            <p className="text-[11px] text-slate-500">
                                                Resolved Qualification Match: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.payload.resolvedQual}</span>
                                            </p>
                                        )}

                                        {item.last_error && (
                                            <p className="text-[11px] text-red-500 font-medium">
                                                Error: {item.last_error}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 text-right text-xs text-slate-400">
                                        <div>
                                            <p>{new Date(item.created_at).toLocaleString()}</p>
                                            {item.sent_at && <p className="text-[10px] text-emerald-500">Sent: {new Date(item.sent_at).toLocaleTimeString()}</p>}
                                        </div>
                                        {item.status === "FAILED" && (
                                            <button
                                                onClick={() => handleRequeue(item.id)}
                                                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-amber-600"
                                            >
                                                Retry
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
