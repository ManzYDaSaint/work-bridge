"use client";

import { useEffect, useState, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { SectionCard } from "@/components/dashboard/ui";

type FeedbackStats = Record<string, Record<string, number>>;

export default function FeedbackVisualizationClient() {
    const [stats, setStats] = useState<FeedbackStats>({});
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);

    const fetchFeedback = useCallback(() => {
        setLoading(true);
        fetch(`/api/admin/ingestion/feedback?days=${days}`)
            .then(res => res.json())
            .then(data => setStats(data.stats))
            .finally(() => setLoading(false));
    }, [days]);

    useEffect(() => {
        fetchFeedback();
    }, [fetchFeedback]);

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Extraction Accuracy Feed</h2>
                <select
                    value={days}
                    onChange={(e) => setDays(parseInt(e.target.value))}
                    className="text-sm border rounded-lg p-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
                >
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                </select>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.entries(stats).length === 0 ? (
                    <div className="col-span-2 text-center p-10 text-gray-500">No feedback available for the selected period.</div>
                ) : (
                    Object.entries(stats).map(([source, fields]) => (
                        <SectionCard key={source} title={`Feedback for Source: ${source}`}>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={Object.entries(fields).map(([name, count]) => ({ name, count }))}>
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#10b981">
                                            {Object.entries(fields).map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#10b981" : "#f43f5e"} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </SectionCard>
                    ))
                )}
            </div>
        </div>
    );
}
