"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { PageHeader, Badge } from "@/components/dashboard/ui";
import { 
    CheckCircle2, XCircle, ShieldCheck, Zap, RefreshCw, Loader2, 
    Send, Sparkles, AlertCircle, Building2, User, Phone, BookOpen, Clock, Layers
} from "lucide-react";
import { toast } from "sonner";

export default function NotificationReviewClient() {
    const [loading, setLoading] = useState(true);
    const [actioningId, setActioningId] = useState<string | null>(null);
    const [dispatchMode, setDispatchMode] = useState<"MANUAL" | "AUTO">("MANUAL");
    const [pendingItems, setPendingItems] = useState<any[]>([]);
    const [recentHistory, setRecentHistory] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<"PENDING" | "HISTORY">("PENDING");

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await apiFetch("/api/admin/notifications");
            if (res.ok) {
                const data = await res.json();
                setDispatchMode(data.dispatchMode || "MANUAL");
                setPendingItems(data.requiresApproval || []);
                setRecentHistory(data.recentHistory || []);
            } else {
                toast.error("Failed to load match approval queue");
            }
        } catch {
            toast.error("Network error fetching notifications");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleToggleDispatchMode = async (newMode: "MANUAL" | "AUTO") => {
        try {
            const res = await apiFetch("/api/admin/notifications", {
                method: "POST",
                body: JSON.stringify({ action: "SET_MODE", dispatchMode: newMode })
            });

            if (res.ok) {
                setDispatchMode(newMode);
                toast.success(newMode === "AUTO" ? "Auto-Pilot Mode Activated!" : "Manual Review Mode Activated!");
            }
        } catch {
            toast.error("Failed to update dispatch mode");
        }
    };

    const handleApproveSingle = async (notificationId: string) => {
        setActioningId(notificationId);
        try {
            const res = await apiFetch("/api/admin/notifications", {
                method: "POST",
                body: JSON.stringify({ action: "APPROVE", notificationId })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || "Match approved & WhatsApp sent!");
                setPendingItems(prev => prev.filter(i => i.id !== notificationId));
            } else {
                toast.error(data.error || "Approval failed");
            }
        } catch {
            toast.error("Action error");
        } finally {
            setActioningId(null);
        }
    };

    const handleRejectSingle = async (notificationId: string) => {
        setActioningId(notificationId);
        try {
            const res = await apiFetch("/api/admin/notifications", {
                method: "POST",
                body: JSON.stringify({ action: "REJECT", notificationId })
            });

            if (res.ok) {
                toast.success("Match rejected");
                setPendingItems(prev => prev.filter(i => i.id !== notificationId));
            }
        } catch {
            toast.error("Reject action error");
        } finally {
            setActioningId(null);
        }
    };

    const handleBulkApproveHighScores = async () => {
        if (!confirm("Approve all high-confidence matches (score >= 80%) for WhatsApp delivery?")) return;
        setLoading(true);
        try {
            const res = await apiFetch("/api/admin/notifications", {
                method: "POST",
                body: JSON.stringify({ action: "APPROVE", approveHighScores: true, minScore: 80 })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || "High score matches dispatched!");
                fetchData();
            } else {
                toast.error(data.error || "Bulk approval failed");
                setLoading(false);
            }
        } catch {
            toast.error("Bulk approval error");
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Match Approvals & WhatsApp Queue"
                subtitle="Human-in-the-Loop moderation engine for verifying candidate-job matches before WhatsApp dispatch."
            />

            {/* Mode Switcher & Stats Bar */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Mode Controller */}
                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {dispatchMode === "MANUAL" ? (
                                <ShieldCheck className="text-amber-500" size={20} />
                            ) : (
                                <Zap className="text-emerald-500" size={20} />
                            )}
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                                {dispatchMode === "MANUAL" ? "Manual Review Mode" : "Auto-Pilot Mode"}
                            </span>
                        </div>
                        <button onClick={fetchData} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {dispatchMode === "MANUAL"
                            ? "Matches require Admin approval before WhatsApp messages are sent."
                            : "High-confidence matches are automatically dispatched via Meta Cloud API."}
                    </p>

                    <div className="mt-4 flex gap-2">
                        <button
                            onClick={() => handleToggleDispatchMode("MANUAL")}
                            className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
                                dispatchMode === "MANUAL"
                                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                                    : "border border-stone-200 bg-stone-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                        >
                            <ShieldCheck size={14} className="inline mr-1" /> Manual Review
                        </button>
                        <button
                            onClick={() => handleToggleDispatchMode("AUTO")}
                            className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
                                dispatchMode === "AUTO"
                                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                                    : "border border-stone-200 bg-stone-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                        >
                            <Zap size={14} className="inline mr-1" /> Auto-Pilot
                        </button>
                    </div>
                </div>

                {/* Queue Summary */}
                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Approvals</p>
                        <p className="mt-1 text-3xl font-extrabold text-amber-600 dark:text-amber-400">{pendingItems.length}</p>
                        <p className="mt-1 text-xs text-slate-500">Awaiting your approval</p>
                    </div>
                    {pendingItems.length > 0 && (
                        <button
                            onClick={handleBulkApproveHighScores}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-amber-500/30 hover:bg-amber-600"
                        >
                            <Sparkles size={14} /> Approve High Scores (≥80%)
                        </button>
                    )}
                </div>

                {/* Delivery History Stats */}
                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Delivery History</p>
                        <p className="mt-1 text-3xl font-extrabold text-slate-900 dark:text-white">{recentHistory.length}</p>
                        <p className="mt-1 text-xs text-slate-500">Total recent logs</p>
                    </div>
                    <div className="text-right">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <Send size={12} /> {recentHistory.filter(h => h.status === "SENT").length} Sent
                        </span>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-stone-200 dark:border-slate-800">
                <button
                    onClick={() => setActiveTab("PENDING")}
                    className={`border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                        activeTab === "PENDING"
                            ? "border-amber-500 text-amber-600 dark:text-amber-400"
                            : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
                    }`}
                >
                    Pending Approvals ({pendingItems.length})
                </button>
                <button
                    onClick={() => setActiveTab("HISTORY")}
                    className={`border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                        activeTab === "HISTORY"
                            ? "border-amber-500 text-amber-600 dark:text-amber-400"
                            : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
                    }`}
                >
                    Delivery Logs & History ({recentHistory.length})
                </button>
            </div>

            {/* Tab 1: Pending Approvals Queue */}
            {activeTab === "PENDING" && (
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex h-48 items-center justify-center rounded-2xl border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                            <Loader2 className="animate-spin text-amber-500" size={28} />
                        </div>
                    ) : pendingItems.length === 0 ? (
                        <div className="rounded-2xl border border-stone-200 bg-white/80 p-12 text-center dark:border-slate-800 dark:bg-slate-900/70">
                            <CheckCircle2 className="mx-auto text-emerald-500" size={36} />
                            <p className="mt-3 text-base font-semibold text-slate-900 dark:text-white">Queue is clear!</p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">There are no pending WhatsApp matches requiring manual review.</p>
                        </div>
                    ) : (
                        pendingItems.map((item) => {
                            const seeker = item.job_seekers || {};
                            const job = item.jobs || {};
                            const matchScore = item.payload?.matchScore || 0;
                            const ruleScore = item.payload?.ruleScore || 0;
                            const vectorScore = item.payload?.vectorScore || 0;

                            return (
                                <div key={item.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-stone-100 pb-4 dark:border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-lg">
                                                {matchScore}%
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Hybrid Score Match</span>
                                                    <Badge label={`Rule: ${ruleScore}%`} variant="blue" />
                                                    <Badge label={`Vector: ${vectorScore}%`} variant="yellow" />
                                                </div>
                                                <p className="text-xs text-slate-400 mt-0.5">Queued {new Date(item.created_at).toLocaleString()}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleRejectSingle(item.id)}
                                                disabled={actioningId === item.id}
                                                className="rounded-xl border border-stone-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-stone-50 hover:text-red-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                            >
                                                Reject Match
                                            </button>
                                            <button
                                                onClick={() => handleApproveSingle(item.id)}
                                                disabled={actioningId === item.id}
                                                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-500/20 hover:bg-amber-600"
                                            >
                                                {actioningId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                                Approve & Send WhatsApp
                                            </button>
                                        </div>
                                    </div>

                                    {/* Match Side-by-Side Breakdown */}
                                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                                        {/* Candidate Side */}
                                        <div className="rounded-xl bg-stone-50/80 p-3.5 dark:bg-slate-800/50">
                                            <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                                                <User size={14} /> Job Seeker Profile
                                            </div>
                                            <p className="mt-1.5 text-sm font-bold text-slate-900 dark:text-white">{seeker.full_name || "Unnamed Seeker"}</p>
                                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                                                <Phone size={12} /> {seeker.phone || "No phone number"}
                                            </p>
                                            <div className="mt-2 text-xs space-y-1 text-slate-600 dark:text-slate-300">
                                                <p><span className="font-semibold text-slate-400">Qualification:</span> {seeker.qualification || "Unlisted"}</p>
                                                <p><span className="font-semibold text-slate-400">Skills:</span> {Array.isArray(seeker.skills) ? seeker.skills.join(", ") : (seeker.skills || "None")}</p>
                                            </div>
                                        </div>

                                        {/* Job Requirements Side */}
                                        <div className="rounded-xl bg-stone-50/80 p-3.5 dark:bg-slate-800/50">
                                            <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                                                <Building2 size={14} /> Job Requirements
                                            </div>
                                            <p className="mt-1.5 text-sm font-bold text-slate-900 dark:text-white">{job.title || item.payload?.jobTitle}</p>
                                            <p className="text-xs text-slate-500 font-semibold mt-0.5">{job.display_company_name || item.payload?.company}</p>
                                            <div className="mt-2 text-xs space-y-1 text-slate-600 dark:text-slate-300">
                                                <p><span className="font-semibold text-slate-400">Req. Qualification:</span> {job.qualification || "Any"}</p>
                                                <p><span className="font-semibold text-slate-400">Min Experience:</span> {job.minimum_years_experience || 0} Yrs</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI Match Reasoning & Scoring Breakdown */}
                                    {item.payload?._scoring && (
                                        <div className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/50 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                                                    <Sparkles size={14} /> Stage 2: Gemini LLM Skills Evaluation
                                                </div>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                                    {item.payload._scoring.llmSkillScore}/100 Score ({item.payload._scoring.llmFromGemini ? "Gemini AI" : "Rule Fallback"})
                                                </span>
                                            </div>
                                            {item.payload._scoring.llmReasoning && (
                                                <p className="mt-1.5 text-xs text-slate-700 dark:text-slate-300 italic">
                                                    &ldquo;{item.payload._scoring.llmReasoning}&rdquo;
                                                </p>
                                            )}
                                            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500 border-t border-amber-200/50 pt-2 dark:border-amber-900/30">
                                                <span><strong className="text-slate-700 dark:text-slate-300">Qual (80%):</strong> {item.payload._scoring.qualScore}</span>
                                                <span><strong className="text-slate-700 dark:text-slate-300">Exp (10%):</strong> {item.payload._scoring.expScore}</span>
                                                <span><strong className="text-slate-700 dark:text-slate-300">Vector Boost:</strong> {item.payload._scoring.vectorBoost > 0 ? `+${item.payload._scoring.vectorBoost}` : item.payload._scoring.vectorBoost} pts ({item.payload._scoring.vectorSimilarity}%)</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Tab 2: Delivery History */}
            {activeTab === "HISTORY" && (
                <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <div className="grid grid-cols-1 gap-2 border-b border-stone-200/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:border-slate-800 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(0,1fr)_auto]">
                        <span>Candidate</span>
                        <span>Job Title</span>
                        <span>Match Score</span>
                        <span className="sm:text-right">Status</span>
                    </div>

                    {recentHistory.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500">No delivery history recorded yet.</div>
                    ) : (
                        recentHistory.map((hist) => (
                            <div key={hist.id} className="grid grid-cols-1 gap-3 border-b border-stone-200/70 px-4 py-3.5 last:border-b-0 dark:border-slate-800 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(0,1fr)_auto] sm:items-center">
                                <div>
                                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{hist.job_seekers?.full_name || "Seeker"}</p>
                                    <p className="text-[11px] text-slate-400">{hist.job_seekers?.phone}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{hist.jobs?.title || hist.payload?.jobTitle}</p>
                                    <p className="text-[11px] text-slate-400">{hist.jobs?.display_company_name || hist.payload?.company}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{hist.payload?.matchScore || 0}%</span>
                                </div>
                                <div className="sm:text-right">
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                        hist.status === "SENT"
                                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                            : hist.status === "REJECTED"
                                            ? "bg-stone-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                            : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                                    }`}>
                                        {hist.status}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
