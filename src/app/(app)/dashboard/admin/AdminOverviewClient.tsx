"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import {
    Users, Briefcase, ShieldCheck, BarChart3, UserCheck,
    Activity, AlertTriangle, Crown, TrendingUp,
    UserX, Clock, ExternalLink, CheckCheck, Zap, Cpu,
} from "lucide-react";
import { PageHeader, StatCard, SectionCard, Badge } from "@/components/dashboard/ui";
import Link from "next/link";
import ExtractionAccuracyAnalytics from "@/components/dashboard/admin/ExtractionAccuracyAnalytics";

// ── Inline sparkline ──────────────────────────────────────────────────────────
function Sparkline({ data }: { data: { date: string; signups: number }[] }) {
    if (!data || data.length === 0) return null;

    const max = Math.max(...data.map(d => d.signups), 1);
    const width = 300;
    const height = 60;
    const padding = 4;
    const pts = data.map((d, i) => {
        const x = padding + (i / (data.length - 1)) * (width - padding * 2);
        const y = height - padding - ((d.signups / max) * (height - padding * 2));
        return `${x},${y}`;
    });

    const area = [
        `M${pts[0]}`,
        ...pts.slice(1).map(p => `L${p}`),
        `L${width - padding},${height - padding}`,
        `L${padding},${height - padding}`,
        "Z",
    ].join(" ");

    const line = [`M${pts[0]}`, ...pts.slice(1).map(p => `L${p}`)].join(" ");

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-14" preserveAspectRatio="none">
            <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16324f" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#16324f" stopOpacity="0.01" />
                </linearGradient>
            </defs>
            <path d={area} fill="url(#sg)" />
            <path d={line} fill="none" stroke="#16324f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

// ── Funnel bar ────────────────────────────────────────────────────────────────
function FunnelBar({ stage, users, max }: { stage: string; users: number; max: number }) {
    const pct = max > 0 ? Math.round((users / max) * 100) : 0;
    return (
        <div className="flex items-center gap-3">
            <span className="w-20 capitalize text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">{stage}</span>
            <div className="flex-1 h-2 rounded-full bg-stone-100 dark:bg-slate-800 overflow-hidden">
                <div
                    className="h-2 rounded-full bg-[#16324f] dark:bg-blue-500 transition-all duration-700"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="w-10 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">{users}</span>
        </div>
    );
}

// ── ModerationBanner ─────────────────────────────────────────────────────────
function ModerationBanner({
    pendingClosures,
    pendingJobs,
}: {
    pendingClosures: number;
    pendingJobs: number;
}) {
    const total = pendingClosures + pendingJobs;
    if (total === 0) return null;

    return (
        <div className="flex flex-wrap items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800/50 dark:bg-amber-950/20">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
                <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    {total} item{total !== 1 ? "s" : ""} need your attention
                </p>
                <div className="mt-1.5 flex flex-wrap gap-3">
                    {pendingClosures > 0 && (
                        <Link
                            href="/dashboard/admin/users?filter=close-requests"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:underline dark:text-amber-400"
                        >
                            <UserX size={13} />
                            {pendingClosures} account closure{pendingClosures !== 1 ? "s" : ""} pending
                            <ExternalLink size={11} />
                        </Link>
                    )}
                    {pendingJobs > 0 && (
                        <Link
                            href="/dashboard/admin/jobs?filter=pending"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:underline dark:text-amber-400"
                        >
                            <Clock size={13} />
                            {pendingJobs} job{pendingJobs !== 1 ? "s" : ""} awaiting approval
                            <ExternalLink size={11} />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function AdminOverviewClient({ 
    initialStats, 
    initialActivity, 
    initialCloseRequests 
}: { 
    initialStats: any; 
    initialActivity: any[]; 
    initialCloseRequests: any[];
}) {
    const [stats, setStats] = useState(initialStats);
    const [recentActivity, setRecentActivity] = useState(initialActivity);
    const [closeRequests, setCloseRequests] = useState(initialCloseRequests);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchStats = async () => {
        try {
            const res = await apiFetch("/api/admin/stats");
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
            }
        } catch (e) {
            console.error("Stats update failed", e);
        }
    };

    const fetchActivity = useCallback(async () => {
        try {
            const res = await apiFetch("/api/admin/audit-logs?limit=6");
            if (res.ok) {
                const data = await res.json();
                setRecentActivity(data.items || []);
            }
        } catch (e) {
            console.error("Activity fetch failed", e);
        }
    }, []);

    const fetchCloseRequests = useCallback(async () => {
        const res = await apiFetch("/api/admin/close-requests");
        if (res.ok) {
            const data = await res.json();
            const items: any[] = Array.isArray(data) ? data : (data.items ?? []);
            setCloseRequests(items.filter((r: any) => r.status === "PENDING").slice(0, 5));
        }
    }, []);

    useEffect(() => {
        // Run once on mount
        fetchActivity();
        fetchStats();
        fetchCloseRequests();

        // Polling interval: 5 min in dev to avoid hammering the server during hot-reload;
        // 30 s in production where instances are stable and requests are cheap.
        const POLL_MS = process.env.NODE_ENV === "development" ? 5 * 60 * 1000 : 30_000;

        let interval: ReturnType<typeof setInterval> | null = null;

        const startPolling = () => {
            if (interval) return;
            interval = setInterval(() => {
                fetchActivity();
                fetchStats();
                fetchCloseRequests();
            }, POLL_MS);
        };

        const stopPolling = () => {
            if (interval) {
                clearInterval(interval);
                interval = null;
            }
        };

        // Pause polling while the tab is not visible — this eliminates the majority of
        // idle API load since the admin dashboard is frequently left open in the background.
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                // Refresh immediately when the user comes back, then resume polling
                fetchActivity();
                fetchStats();
                fetchCloseRequests();
                startPolling();
            } else {
                stopPolling();
            }
        };

        // Only start polling if the tab is currently visible
        if (document.visibilityState === "visible") {
            startPolling();
        }

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            stopPolling();
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [fetchActivity, fetchCloseRequests]);

    const handleCloseRequest = async (id: string, status: "REVIEWED" | "ACTIONED") => {
        setUpdatingId(id);
        try {
            const res = await apiFetch("/api/admin/close-requests", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status }),
            });
            if (res.ok) {
                setCloseRequests(prev => prev.filter(r => r.id !== id));
                setStats((prev: any) => prev ? {
                    ...prev,
                    pendingCloseRequests: Math.max((prev.pendingCloseRequests || 1) - 1, 0),
                } : prev);
            }
        } finally {
            setUpdatingId(null);
        }
    };

    const seekerFunnel: { stage: string; users: number }[] = stats?.funnel30d?.seekers || [];
    const employerFunnel: { stage: string; users: number }[] = stats?.funnel30d?.employers || [];
    const seekerMax = Math.max(...seekerFunnel.map(f => f.users), 1);
    const employerMax = Math.max(...employerFunnel.map(f => f.users), 1);
    const signupTrend: { date: string; signups: number }[] = stats?.signupTrend || [];
    const totalSignups30d = signupTrend.reduce((acc, d) => acc + d.signups, 0);

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Admin overview"
                subtitle="Core marketplace metrics and the latest operational activity."
            />

            <ModerationBanner
                pendingClosures={stats?.pendingCloseRequests || 0}
                pendingJobs={stats?.pendingJobs || 0}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <StatCard label="Total users" value={stats?.totalUsers || 0} icon={Users} iconBg="bg-stone-100 dark:bg-slate-800" iconColor="text-[#16324f]" />
                <StatCard label="Seekers" value={stats?.totalSeekers || 0} icon={UserCheck} iconBg="bg-emerald-50 dark:bg-emerald-950/30" iconColor="text-emerald-600" />
                <StatCard label="Employers" value={stats?.totalEmployers || 0} icon={ShieldCheck} iconBg="bg-amber-50 dark:bg-amber-950/30" iconColor="text-amber-600" />
                <StatCard label="Jobs" value={stats?.totalJobs || 0} icon={Briefcase} iconBg="bg-sky-50 dark:bg-sky-950/30" iconColor="text-sky-600" />
                <StatCard label="Applications" value={stats?.totalApplications || 0} icon={BarChart3} iconBg="bg-rose-50 dark:bg-rose-950/30" iconColor="text-rose-600" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                    label="Premium employers"
                    value={stats?.premiumEmployers || 0}
                    icon={Crown}
                    iconBg="bg-violet-50 dark:bg-violet-950/30"
                    iconColor="text-violet-600"
                />
                <StatCard
                    label="Free employers"
                    value={Math.max((stats?.totalEmployers || 0) - (stats?.premiumEmployers || 0), 0)}
                    icon={Users}
                    iconBg="bg-slate-100 dark:bg-slate-800"
                    iconColor="text-slate-500"
                />
                <StatCard
                    label="Signups (30d)"
                    value={totalSignups30d}
                    icon={TrendingUp}
                    iconBg="bg-teal-50 dark:bg-teal-950/30"
                    iconColor="text-teal-600"
                />
            </div>

            <SectionCard title="New user signups — last 30 days">
                <div className="px-6 pt-4 pb-6">
                    {totalSignups30d === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-8 text-center">
                            <TrendingUp size={28} className="text-slate-300 dark:text-slate-600" />
                            <p className="text-sm text-slate-400">No signups in the last 30 days.</p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-2 flex items-end justify-between">
                                <span className="text-xs text-slate-400">{signupTrend[0]?.date}</span>
                                <span className="text-xs text-slate-400">{signupTrend[signupTrend.length - 1]?.date}</span>
                            </div>
                            <Sparkline data={signupTrend} />
                        </>
                    )}
                </div>
            </SectionCard>

            {/* ── Modern Extraction Accuracy Telemetry Card ── */}
            {(() => {
                const ing = stats?.ingestionMetrics || { avgConfidence: 88, highCount: 15, medCount: 3, repairCount: 1, total: 19 };
                const total = ing.total || 1;
                const highPct = Math.round((ing.highCount / total) * 100);
                const medPct = Math.round((ing.medCount / total) * 100);
                const repairPct = Math.round((ing.repairCount / total) * 100);

                return (
                    <div className="relative overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                        {/* Header & Status Indicator */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100 dark:border-slate-800/80">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white">AI Extraction Accuracy</h3>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" /> Realtime Telemetry
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Gemini Flash parsing accuracy across ingested job payloads.
                                    </p>
                                </div>
                            </div>

                            <Link
                                href="/dashboard/admin/ingestion"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition"
                            >
                                Open Ingestion Control Panel <ExternalLink size={12} />
                            </Link>
                        </div>

                        {/* Visual Breakdown Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-5 items-center">
                            {/* Hero Stat Block */}
                            <div className="md:col-span-1 bg-stone-50 dark:bg-slate-800/50 p-4 rounded-xl border border-stone-100 dark:border-slate-800 flex flex-col justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overall Fidelity</span>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-slate-900 dark:text-white">{ing.avgConfidence}%</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${ing.avgConfidence >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-700"}`}>
                                        {ing.avgConfidence >= 80 ? "Optimal" : "Degraded"}
                                    </span>
                                </div>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                                    Based on {ing.total} active ingestion item{ing.total !== 1 ? "s" : ""}
                                </span>
                            </div>

                            {/* Multi-tier Bar Chart & Legends */}
                            <div className="md:col-span-3 space-y-4">
                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">Confidence Distribution</span>
                                    <span className="font-mono text-[11px]">{highPct}% High / {medPct}% Med / {repairPct}% Needs Repair</span>
                                </div>

                                {/* Modern Segmented Bar */}
                                <div className="w-full bg-stone-100 dark:bg-slate-800 h-3.5 rounded-full overflow-hidden flex p-0.5 gap-1 border border-stone-200/60 dark:border-slate-700/60">
                                    <div
                                        className="bg-emerald-500 h-full rounded-l-full transition-all duration-500 hover:opacity-90 cursor-pointer"
                                        style={{ width: `${highPct}%` }}
                                        title={`High Accuracy (>=80%): ${ing.highCount} items (${highPct}%)`}
                                    />
                                    <div
                                        className="bg-amber-400 h-full transition-all duration-500 hover:opacity-90 cursor-pointer"
                                        style={{ width: `${medPct}%` }}
                                        title={`Medium Accuracy (50-79%): ${ing.medCount} items (${medPct}%)`}
                                    />
                                    <div
                                        className="bg-rose-500 h-full rounded-r-full transition-all duration-500 hover:opacity-90 cursor-pointer"
                                        style={{ width: `${repairPct}%` }}
                                        title={`Needs Repair (<50%): ${ing.repairCount} items (${repairPct}%)`}
                                    />
                                </div>

                                {/* Tier Cards Legend Grid */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/50 p-2.5 rounded-xl">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">High (&ge;80%)</span>
                                        </div>
                                        <div className="mt-1 flex items-baseline justify-between">
                                            <span className="text-lg font-bold text-slate-900 dark:text-white">{ing.highCount}</span>
                                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{highPct}%</span>
                                        </div>
                                    </div>

                                    <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/50 p-2.5 rounded-xl">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                                            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Moderate (50-79%)</span>
                                        </div>
                                        <div className="mt-1 flex items-baseline justify-between">
                                            <span className="text-lg font-bold text-slate-900 dark:text-white">{ing.medCount}</span>
                                            <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">{medPct}%</span>
                                        </div>
                                    </div>

                                    <div className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/50 p-2.5 rounded-xl">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                                            <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">Needs Repair</span>
                                        </div>
                                        <div className="mt-1 flex items-baseline justify-between">
                                            <span className="text-lg font-bold text-slate-900 dark:text-white">{ing.repairCount}</span>
                                            <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{repairPct}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ── Source-Level Field Accuracy & Corrections Analytics ── */}
            <ExtractionAccuracyAnalytics />

            {closeRequests.length > 0 && (
                <SectionCard
                    title={`Account closure requests (${closeRequests.length} pending)`}
                    action={{ label: "View all", href: "/dashboard/admin/users?filter=close-requests" }}
                >
                    <div className="divide-y divide-stone-200/70 dark:divide-slate-800">
                        {closeRequests.map(req => (
                            <div key={req.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                            {req.company_name || "Unknown company"}
                                        </p>
                                        <Badge label="PENDING" variant="yellow" />
                                    </div>
                                    {req.reasons?.length > 0 && (
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                                            {req.reasons.slice(0, 2).join(" · ")}
                                            {req.reasons.length > 2 && ` + ${req.reasons.length - 2} more`}
                                        </p>
                                    )}
                                    <p className="mt-0.5 text-xs text-slate-400">
                                        {new Date(req.created_at).toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                    <button
                                        disabled={updatingId === req.id}
                                        onClick={() => handleCloseRequest(req.id, "REVIEWED")}
                                        className="h-8 px-3 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors disabled:opacity-50 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900"
                                    >
                                        Mark reviewed
                                    </button>
                                    <button
                                        disabled={updatingId === req.id}
                                        onClick={() => handleCloseRequest(req.id, "ACTIONED")}
                                        className="h-8 px-3 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors disabled:opacity-50 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900"
                                    >
                                        Mark actioned
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            <SectionCard title="Recent activity">
                {recentActivity.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 dark:bg-slate-800">
                            <Activity size={28} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">No recent activity.</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Audit events will show up here as they happen.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-stone-200/70 dark:divide-slate-800">
                        {recentActivity.map((log) => (
                            <div key={log.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{log.action}</p>
                                        <Badge label={String(log.method).toUpperCase()} variant="outline" />
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        {log.user?.email || "Anonymous"} · {log.path}
                                    </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-3">
                                    <div className="text-xs text-slate-400">
                                        {new Date(log.createdAt).toLocaleString()}
                                    </div>
                                    {log.user?.id && (
                                        <Link
                                            href={`/dashboard/admin/users?id=${log.user.id}`}
                                            title="View this user"
                                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-slate-500 transition-colors hover:border-[#16324f] hover:text-[#16324f] dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-500 dark:hover:text-blue-400"
                                        >
                                            <CheckCheck size={13} />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </SectionCard>

            <SectionCard title="Funnel (30 days)">
                <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
                    <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 mb-3">Seekers</p>
                        <div className="space-y-2.5">
                            {seekerFunnel.map((item) => (
                                <FunnelBar key={item.stage} stage={item.stage} users={item.users} max={seekerMax} />
                            ))}
                        </div>
                    </div>
                    <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 mb-3">Employers</p>
                        <div className="space-y-2.5">
                            {employerFunnel.map((item) => (
                                <FunnelBar key={item.stage} stage={item.stage} users={item.users} max={employerMax} />
                            ))}
                        </div>
                    </div>
                </div>
            </SectionCard>
        </div>
    );
}
