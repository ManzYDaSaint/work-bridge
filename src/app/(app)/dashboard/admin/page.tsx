"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
    Users, Briefcase, ShieldCheck, BarChart3, UserCheck,
    Loader2, Activity, AlertTriangle, Crown, TrendingUp,
    UserX, Clock, ExternalLink, CheckCheck,
} from "lucide-react";
import { PageHeader, StatCard, SectionCard, Badge } from "@/components/dashboard/ui";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";
import Link from "next/link";

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

export default function AdminOverviewPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [closeRequests, setCloseRequests] = useState<any[]>([]);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const supabase = createBrowserSupabaseClient();

    const fetchStats = async () => {
        try {
            const res = await apiFetch("/api/admin/stats");
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchActivity = async () => {
        const { data } = await supabase
            .from("audit_logs")
            .select("*, user:users(id, email, role)")
            .order("created_at", { ascending: false })
            .limit(6);
        if (data) setRecentActivity(data);
    };

    const fetchCloseRequests = async () => {
        const res = await apiFetch("/api/admin/close-requests");
        if (res.ok) {
            const data = await res.json();
            setCloseRequests(data.filter((r: any) => r.status === "PENDING").slice(0, 5));
        }
    };

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

    useEffect(() => {
        fetchStats();
        fetchActivity();
        fetchCloseRequests();

        const channel = supabase
            .channel(`admin-activity-${Date.now()}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, () => {
                fetchActivity();
                fetchStats();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#16324f]" />
            </div>
        );
    }

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

            {/* ── Moderation Banner ───────────────────────────────────── */}
            <ModerationBanner
                pendingClosures={stats?.pendingCloseRequests || 0}
                pendingJobs={stats?.pendingJobs || 0}
            />

            {/* ── Core Stats ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <StatCard label="Total users" value={stats?.totalUsers || 0} icon={Users} iconBg="bg-stone-100 dark:bg-slate-800" iconColor="text-[#16324f]" />
                <StatCard label="Seekers" value={stats?.totalSeekers || 0} icon={UserCheck} iconBg="bg-emerald-50 dark:bg-emerald-950/30" iconColor="text-emerald-600" />
                <StatCard label="Employers" value={stats?.totalEmployers || 0} icon={ShieldCheck} iconBg="bg-amber-50 dark:bg-amber-950/30" iconColor="text-amber-600" />
                <StatCard label="Jobs" value={stats?.totalJobs || 0} icon={Briefcase} iconBg="bg-sky-50 dark:bg-sky-950/30" iconColor="text-sky-600" />
                <StatCard label="Applications" value={stats?.totalApplications || 0} icon={BarChart3} iconBg="bg-rose-50 dark:bg-rose-950/30" iconColor="text-rose-600" />
            </div>

            {/* ── Revenue / Premium Row ───────────────────────────────── */}
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

            {/* ── Signup Trend Chart ──────────────────────────────────── */}
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

            {/* ── Pending Closure Requests ────────────────────────────── */}
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
                                        Action & close
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            {/* ── Recent Activity ─────────────────────────────────────── */}
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
                                        {new Date(log.created_at).toLocaleString()}
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

            {/* ── Funnel (30 Days) ────────────────────────────────────── */}
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
