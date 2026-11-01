"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { BarChart3, Users, MousePointerClick, TrendingUp, Loader2, ArrowRight, UserCheck, ShieldAlert, Sparkles } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface AnalyticsData {
    jobId: string;
    totalViews: number;
    totalApplications: number;
    guestApplicationsCount?: number;
    conversionRate: number;
    stageCounts?: {
        applied: number;
        shortlisted: number;
        interviewing: number;
        hired: number;
        rejected: number;
    };
    rejectionReasons?: Array<{ reason: string; count: number }>;
    chartData: Array<{ date: string; views: number }>;
}

export default function JobAnalyticsPanel({ jobId }: { jobId: string }) {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await apiFetch(`/api/employer/jobs/${jobId}/analytics`);
                if (res.ok) {
                    setData(await res.json());
                }
            } catch (error) {
                console.error("Failed to fetch analytics:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (jobId) fetchAnalytics();
    }, [jobId]);

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
        );
    }

    if (!data) return null;

    const stages = [
        { label: "Applied", count: data.stageCounts?.applied || data.totalApplications, color: "bg-blue-500" },
        { label: "Shortlisted", count: data.stageCounts?.shortlisted || 0, color: "bg-indigo-500" },
        { label: "Interview", count: data.stageCounts?.interviewing || 0, color: "bg-amber-500" },
        { label: "Hired", count: data.stageCounts?.hired || 0, color: "bg-emerald-500" },
    ];

    const maxStage = Math.max(...stages.map(s => s.count), 1);

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                        <BarChart3 className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Listing Performance</h3>
                        <p className="text-xs text-slate-500">Real-time candidate conversion & reach</p>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                        <div className="mb-2 flex items-center gap-2 text-slate-500">
                            <MousePointerClick className="h-4 w-4" />
                            <span className="text-[11px] font-bold uppercase tracking-wider">Total Views</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{data.totalViews}</p>
                    </div>

                    <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                        <div className="mb-2 flex items-center gap-2 text-slate-500">
                            <Users className="h-4 w-4" />
                            <span className="text-[11px] font-bold uppercase tracking-wider">Applications</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{data.totalApplications}</p>
                        {data.guestApplicationsCount !== undefined && (
                            <p className="mt-1 text-[11px] text-slate-500">
                                {data.guestApplicationsCount} direct guest CVs
                            </p>
                        )}
                    </div>

                    <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                        <div className="mb-2 flex items-center gap-2 text-slate-500">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-[11px] font-bold uppercase tracking-wider">Conversion</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{data.conversionRate}%</p>
                    </div>

                    <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                        <div className="mb-2 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                            <UserCheck className="h-4 w-4" />
                            <span className="text-[11px] font-bold uppercase tracking-wider">Hired</span>
                        </div>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            {data.stageCounts?.hired || 0}
                        </p>
                    </div>
                </div>

                {/* 14-Day View Velocity Chart */}
                <div className="mt-6 border-t border-stone-100 pt-6 dark:border-slate-800">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">14-Day Traffic Velocity</p>
                    <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis 
                                    dataKey="date" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 11, fill: '#64748b' }} 
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 11, fill: '#64748b' }} 
                                    allowDecimals={false}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="views" 
                                    stroke="#4f46e5" 
                                    strokeWidth={3}
                                    dot={{ fill: '#4f46e5', strokeWidth: 2, r: 3 }}
                                    activeDot={{ r: 5 }}
                                    animationDuration={1000}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Greenhouse/Workable Style: Recruitment Stage Funnel & Rejection Breakdown */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Stage Progression Funnel */}
                <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Sparkles size={16} className="text-[#16324f] dark:text-amber-400" />
                        Recruitment Pipeline Velocity
                    </h3>
                    <p className="text-xs text-slate-500">
                        Conversion rate of candidates moving through your hiring milestones.
                    </p>

                    <div className="space-y-3 pt-2">
                        {stages.map((stage) => {
                            const pct = Math.round((stage.count / maxStage) * 100);
                            return (
                                <div key={stage.label} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs font-semibold">
                                        <span className="text-slate-700 dark:text-slate-300">{stage.label}</span>
                                        <span className="text-slate-900 dark:text-white font-bold">{stage.count}</span>
                                    </div>
                                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden dark:bg-slate-800">
                                        <div
                                            className={`h-full ${stage.color} rounded-full transition-all duration-500`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Rejection Reasons Analysis */}
                <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <ShieldAlert size={16} className="text-rose-600 dark:text-rose-400" />
                        Candidate Rejection Analysis
                    </h3>
                    <p className="text-xs text-slate-500">
                        Standardized reasons logged when candidates are marked as rejected.
                    </p>

                    {data.rejectionReasons && data.rejectionReasons.length > 0 ? (
                        <div className="space-y-2 pt-2">
                            {data.rejectionReasons.map((item) => (
                                <div key={item.reason} className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50/60 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-800/40">
                                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[260px]">
                                        {item.reason}
                                    </span>
                                    <span className="rounded-md bg-rose-50 px-2 py-0.5 font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                                        {item.count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-stone-100 bg-stone-50/50 p-6 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-800/30">
                            No rejections logged for this listing yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
