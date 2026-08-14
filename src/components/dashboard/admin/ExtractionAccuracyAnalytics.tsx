"use client";

import { useEffect, useState, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { Activity, BarChart2, ShieldCheck, Sparkles, Filter, RefreshCw } from "lucide-react";

type FeedbackStats = Record<string, Record<string, number>>;

export default function ExtractionAccuracyAnalytics() {
    const [stats, setStats] = useState<FeedbackStats>({});
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);

    const fetchFeedback = useCallback(() => {
        setLoading(true);
        fetch(`/api/admin/ingestion/feedback?days=${days}`)
            .then(res => res.json())
            .then(data => setStats(data.stats || {}))
            .catch(() => setStats({}))
            .finally(() => setLoading(false));
    }, [days]);

    useEffect(() => {
        fetchFeedback();
    }, [fetchFeedback]);

    const sources = Object.entries(stats);

    return (
        <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
            {/* Component Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                        <BarChart2 className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Field Extraction Accuracy & Feedback</h3>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                <Sparkles className="w-3 h-3 mr-1 text-indigo-500 animate-spin" /> Source Analytics
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Detailed field-level edit and corrections breakdown per ingestion connector source.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-stone-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-slate-700">
                        <Filter className="w-3.5 h-3.5 text-slate-400" />
                        <select
                            value={days}
                            onChange={(e) => setDays(parseInt(e.target.value))}
                            className="text-xs font-semibold bg-transparent border-none text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                        >
                            <option value="7">Last 7 Days</option>
                            <option value="30">Last 30 Days</option>
                            <option value="90">Last 90 Days</option>
                        </select>
                    </div>
                    <button
                        onClick={fetchFeedback}
                        disabled={loading}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-xl transition"
                        title="Refresh Analytics"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Content Body */}
            {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                    <span className="text-xs font-medium">Loading field accuracy statistics...</span>
                </div>
            ) : sources.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-stone-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-stone-200 dark:border-slate-800">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No source feedback recorded for this window.</p>
                    <p className="text-xs text-slate-400 mt-1">Field-level edit corrections from human approvals will display here automatically.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {sources.map(([source, fields]) => {
                        const chartData = Object.entries(fields).map(([name, count]) => ({
                            field: name.replace(/_/g, " "),
                            corrections: count,
                        }));
                        const totalCorrections = Object.values(fields).reduce((a, b) => a + b, 0);

                        return (
                            <div
                                key={source}
                                className="bg-stone-50/60 dark:bg-slate-800/40 border border-stone-200/70 dark:border-slate-700/60 rounded-xl p-4 flex flex-col justify-between"
                            >
                                <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-200/50 dark:border-slate-700/50">
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                            Source: <span className="text-indigo-600 dark:text-indigo-400">{source}</span>
                                        </h4>
                                        <p className="text-[11px] text-slate-400">Field modifications tracked during admin verification</p>
                                    </div>
                                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900">
                                        {totalCorrections} edits
                                    </span>
                                </div>

                                <div className="h-52 w-full pt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150, 150, 150, 0.15)" />
                                            <XAxis
                                                dataKey="field"
                                                tick={{ fontSize: 10, fill: "#94a3b8" }}
                                                interval={0}
                                                angle={-25}
                                                textAnchor="end"
                                            />
                                            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: "#0f172a",
                                                    borderColor: "#334155",
                                                    borderRadius: "0.5rem",
                                                    color: "#f8fafc",
                                                    fontSize: "12px",
                                                }}
                                                cursor={{ fill: "rgba(16, 185, 129, 0.05)" }}
                                            />
                                            <Bar dataKey="corrections" radius={[4, 4, 0, 0]}>
                                                {chartData.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#6366f1" : "#10b981"} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
