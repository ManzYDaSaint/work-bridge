"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { BarChart3, Users, MousePointerClick, TrendingUp, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface AnalyticsData {
    jobId: string;
    totalViews: number;
    totalApplications: number;
    conversionRate: number;
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

    return (
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                    <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Performance Analytics</h3>
                    <p className="text-sm text-slate-500">Last 14 days of listing activity</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                    <div className="mb-2 flex items-center gap-2 text-slate-500">
                        <MousePointerClick className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Total Views</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{data.totalViews}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                    <div className="mb-2 flex items-center gap-2 text-slate-500">
                        <Users className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Applications</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{data.totalApplications}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                    <div className="mb-2 flex items-center gap-2 text-slate-500">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Conversion Rate</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{data.conversionRate}%</p>
                </div>
            </div>

            <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fill: '#64748b' }} 
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fill: '#64748b' }} 
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
                            dot={{ fill: '#4f46e5', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6 }}
                            animationDuration={1000}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
