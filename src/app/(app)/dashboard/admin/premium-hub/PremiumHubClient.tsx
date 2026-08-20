"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/ui";
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Loader2, ExternalLink, MessageSquare, TrendingUp, BarChart3 } from "lucide-react";

function ScoreBar({ label, value, total }: { label: string; value: number; total: number }) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-300">{label}</span>
                <span className="text-slate-400">{value} ({pct}%)</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-amber-500 transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

export default function MatchAnalyticsClient() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [tab, setTab] = useState<"ANALYTICS" | "TEMPLATES" | "JOB_HEALTH" | "SETTINGS">("ANALYTICS");
    const [templates, setTemplates] = useState<any>(null);
    const [jobHealth, setJobHealth] = useState<any>(null);
    const [settings, setSettings] = useState<any>(null);
    const [savingKey, setSavingKey] = useState<string | null>(null);
    const [settingValues, setSettingValues] = useState<Record<string, string>>({});
    const [forceEmbeddingLoading, setForceEmbeddingLoading] = useState(false);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [analyticsRes, templatesRes, jobRes, settingsRes] = await Promise.all([
                apiFetch("/api/admin/match-analytics"),
                apiFetch("/api/admin/whatsapp-templates"),
                apiFetch("/api/admin/job-health"),
                apiFetch("/api/admin/settings"),
            ]);
            if (analyticsRes.ok) setData(await analyticsRes.json());
            if (templatesRes.ok) setTemplates(await templatesRes.json());
            if (jobRes.ok) setJobHealth(await jobRes.json());
            if (settingsRes.ok) {
                const s = await settingsRes.json();
                setSettings(s);
                setSettingValues(s.settings || {});
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleForceEmbeddings = async (jobId?: string) => {
        setForceEmbeddingLoading(true);
        const { toast } = await import("sonner");
        toast.loading("Generating AI embeddings...");
        try {
            const res = await apiFetch("/api/admin/job-health", {
                method: "POST",
                body: JSON.stringify({ jobId }),
                headers: { "Content-Type": "application/json" },
            });
            toast.dismiss();
            if (res.ok) {
                const result = await res.json();
                toast.success(result.message || "Embeddings generated!");
                fetchAll();
            } else {
                toast.error("Failed to generate embeddings.");
            }
        } catch {
            toast.dismiss();
            toast.error("Failed to generate embeddings.");
        } finally {
            setForceEmbeddingLoading(false);
        }
    };

    const saveSetting = async (key: string) => {
        setSavingKey(key);
        try {
            const res = await apiFetch("/api/admin/settings", {
                method: "POST",
                body: JSON.stringify({ key, value: settingValues[key] })
            });
            if (res.ok) {
                const { toast } = await import("sonner");
                toast.success(`${key} updated`);
            }
        } finally { setSavingKey(null); }
    };

    const statusColor = (status: string) => {
        if (status === "APPROVED") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
        if (status === "REJECTED") return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
        return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <PageHeader title="Premium Analytics & Settings" subtitle="Match precision insights, WhatsApp templates, job health, and system configuration." />
                <button onClick={fetchAll} className="rounded-xl border border-stone-200 p-2 text-slate-400 hover:text-slate-700 dark:border-slate-700">
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-1 border-b border-stone-200 dark:border-slate-800">
                {[
                    { key: "ANALYTICS", label: "Match Analytics", icon: <TrendingUp size={14} /> },
                    { key: "TEMPLATES", label: "WhatsApp Templates", icon: <MessageSquare size={14} /> },
                    { key: "JOB_HEALTH", label: "Job Board Health", icon: <BarChart3 size={14} /> },
                    { key: "SETTINGS", label: "System Settings", icon: <CheckCircle2 size={14} /> },
                ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key as any)}
                        className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${tab === t.key ? "border-amber-500 text-amber-600 dark:text-amber-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex h-48 items-center justify-center"><Loader2 className="animate-spin text-amber-500" size={28} /></div>
            ) : (
                <>
                    {/* Analytics Tab */}
                    {tab === "ANALYTICS" && data && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                                {[
                                    { label: "Total Matches", value: data.stats.total, color: "text-slate-900 dark:text-white" },
                                    { label: "Approved", value: data.stats.approved, color: "text-emerald-600 dark:text-emerald-400" },
                                    { label: "Rejected", value: data.stats.rejected, color: "text-red-600 dark:text-red-400" },
                                    { label: "Approval Rate", value: `${data.stats.approvalRate}%`, color: "text-amber-600 dark:text-amber-400" },
                                ].map((s, i) => (
                                    <div key={i} className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{s.label}</p>
                                        <p className={`mt-1 text-3xl font-extrabold ${s.color}`}>{s.value}</p>
                                    </div>
                                ))}
                            </div>

                            {data.stats.suggestAutoAt75 && (
                                <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                                        <strong>Threshold Advisor:</strong> 90%+ of your reviewed matches score ≥75%. Consider switching to Auto-Pilot mode.
                                    </p>
                                </div>
                            )}

                            <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 space-y-3">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">Score Distribution</p>
                                {Object.entries(data.scoreBuckets || {}).map(([range, count]) => (
                                    <ScoreBar key={range} label={`${range}%`} value={count as number} total={data.stats.total} />
                                ))}
                            </div>

                            <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                                <p className="mb-3 text-sm font-bold text-slate-900 dark:text-white">7-Day Match Trend</p>
                                <div className="overflow-x-auto">
                                    <div className="flex items-end gap-2" style={{ minWidth: "360px", height: "80px" }}>
                                        {(data.trend || []).map((day: any, i: number) => {
                                            const max = Math.max(...data.trend.map((d: any) => d.approved + d.rejected), 1);
                                            const h = Math.round(((day.approved + day.rejected) / max) * 70);
                                            return (
                                                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                                                    <div className="w-full rounded-t-lg bg-amber-400" style={{ height: `${h}px` }} title={`${day.approved} approved, ${day.rejected} rejected`} />
                                                    <span className="text-[9px] text-slate-400">{day.date.slice(5)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* WhatsApp Templates Tab */}
                    {tab === "TEMPLATES" && templates && (
                        <div className="space-y-4">
                            {templates.message && (
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
                                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">{templates.message}</p>
                                    {templates.metaUrl && (
                                        <a href={templates.metaUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600">
                                            <ExternalLink size={14} /> Create Template in Meta Business
                                        </a>
                                    )}
                                </div>
                            )}
                            {(templates.templates || []).length === 0 && !templates.message && (
                                <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
                                    <MessageSquare className="mx-auto text-slate-300" size={32} />
                                    <p className="mt-3 font-semibold text-slate-900 dark:text-white">No templates found</p>
                                    <p className="text-sm text-slate-400">Create message templates in Meta Business Suite first.</p>
                                    {templates.metaUrl && <a href={templates.metaUrl} target="_blank" className="mt-3 inline-flex items-center gap-1 text-sm text-amber-600 hover:underline"><ExternalLink size={14} /> Open Meta Business Suite</a>}
                                </div>
                            )}
                            {(templates.templates || []).map((t: any, i: number) => (
                                <div key={i} className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white font-mono text-sm">{t.name}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{t.category} · {t.language}</p>
                                        </div>
                                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusColor(t.status)}`}>{t.status}</span>
                                    </div>
                                    {t.components?.map((c: any, j: number) => c.type === "BODY" && (
                                        <div key={j} className="mt-3 rounded-xl bg-stone-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-mono whitespace-pre-wrap">{c.text}</div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Job Health Tab */}
                    {tab === "JOB_HEALTH" && jobHealth && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                                {[
                                    { label: "No Embedding", value: jobHealth.stats?.noEmbedding || 0, color: "text-red-600", icon: <XCircle size={20} className="text-red-500" /> },
                                    { label: "Past Deadline", value: jobHealth.stats?.pastDeadline || 0, color: "text-orange-600", icon: <AlertTriangle size={20} className="text-orange-500" /> },
                                    { label: "No Applications (14d)", value: jobHealth.stats?.noApplications || 0, color: "text-amber-600", icon: <AlertTriangle size={20} className="text-amber-500" /> },
                                    { label: "Pending Moderation", value: jobHealth.stats?.pendingModeration || 0, color: "text-slate-600", icon: <CheckCircle2 size={20} className="text-slate-500" /> },
                                ].map((s, i) => (
                                    <div key={i} className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                                        <div className="flex items-center justify-between">{s.icon}<p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{s.label}</p></div>
                                        <p className={`mt-2 text-3xl font-extrabold ${s.color} dark:opacity-80`}>{s.value}</p>
                                    </div>
                                ))}
                            </div>
                            {(jobHealth.noEmbedding || []).length > 0 && (
                                <div className="rounded-2xl border border-red-200 bg-white dark:border-red-900/40 dark:bg-slate-900 overflow-hidden">
                                    <div className="border-b border-stone-100 px-5 py-3 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                                        <p className="text-sm font-bold text-red-700 dark:text-red-400">Active Jobs Missing Embedding (won't match)</p>
                                        <button
                                            onClick={() => handleForceEmbeddings()}
                                            disabled={forceEmbeddingLoading}
                                            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-60 shrink-0"
                                        >
                                            {forceEmbeddingLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                            Force Embedding Sync
                                        </button>
                                    </div>
                                    {jobHealth.noEmbedding.map((j: any) => (
                                        <div key={j.id} className="flex items-center justify-between border-b border-stone-100 px-5 py-3 last:border-0 dark:border-slate-800">
                                            <div><p className="text-xs font-semibold text-slate-900 dark:text-white">{j.title}</p><p className="text-[11px] text-slate-400">{j.display_company_name}</p></div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[11px] text-slate-400">{new Date(j.created_at).toLocaleDateString()}</span>
                                                <button
                                                    onClick={() => handleForceEmbeddings(j.id)}
                                                    disabled={forceEmbeddingLoading}
                                                    className="rounded-lg border border-stone-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50"
                                                >
                                                    Generate
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Settings Tab */}
                    {tab === "SETTINGS" && settings && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 space-y-5">
                                <p className="font-bold text-slate-900 dark:text-white">System Configuration</p>
                                {[
                                    { key: "MATCH_SCORE_THRESHOLD", label: "Match Score Threshold (%)", hint: "Minimum hybrid score to queue a WhatsApp notification.", type: "number", min: 30, max: 95 },
                                    { key: "BULK_APPROVE_MIN_SCORE", label: "Bulk Approve Min Score (%)", hint: "Minimum score for 'Approve High Scores' bulk action.", type: "number", min: 50, max: 99 },
                                    { key: "WHATSAPP_DAILY_CAP", label: "WhatsApp Daily Message Cap", hint: "Max WhatsApp notifications per day to prevent rate limiting.", type: "number", min: 1, max: 1000 },
                                ].map(({ key, label, hint, type, min, max }) => (
                                    <div key={key} className="space-y-1.5">
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">{label}</label>
                                        <p className="text-xs text-slate-400">{hint}</p>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type={type} min={min} max={max}
                                                value={settingValues[key] || ""}
                                                onChange={e => setSettingValues(prev => ({ ...prev, [key]: e.target.value }))}
                                                className="w-32 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                            />
                                            <button
                                                onClick={() => saveSetting(key)}
                                                disabled={savingKey === key}
                                                className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-60"
                                            >
                                                {savingKey === key ? <Loader2 size={12} className="animate-spin" /> : null} Save
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
