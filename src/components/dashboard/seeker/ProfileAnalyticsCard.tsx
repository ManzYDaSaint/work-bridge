"use client";

import { useEffect, useState } from "react";
import { Eye, Search, TrendingUp, Sparkles, Shield } from "lucide-react";
import { SectionCard } from "@/components/dashboard/ui";

interface AnalyticsData {
    profileViews: number;
    searchAppearances: number;
    topInDemandSkills: string[];
    visibilityScore: number;
    visibilityStatus: string;
}

export default function ProfileAnalyticsCard() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        fetch("/api/seeker/analytics")
            .then(res => res.json())
            .then(res => {
                if (isMounted && res.success) {
                    setData(res.analytics);
                }
            })
            .catch(err => console.error("Failed to load analytics", err))
            .finally(() => {
                if (isMounted) setLoading(false);
            });
        return () => { isMounted = false; };
    }, []);

    if (loading) {
        return (
            <SectionCard title="Profile Analytics & Employer Insights">
                <div className="p-6 text-xs text-slate-400 animate-pulse">
                    Loading profile impressions and search statistics...
                </div>
            </SectionCard>
        );
    }

    if (!data) return null;

    return (
        <SectionCard title="Profile Analytics & Employer Insights">
            <div className="space-y-5 p-6">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {/* 30-Day Profile Views */}
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3.5 dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                            <Eye size={14} className="text-amber-500" />
                            <span>30-Day Views</span>
                        </div>
                        <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">
                            {data.profileViews}
                        </p>
                        <p className="mt-0.5 text-[10px] text-emerald-600 font-medium">+18% vs last month</p>
                    </div>

                    {/* Search Appearances */}
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3.5 dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                            <Search size={14} className="text-[#16324f] dark:text-slate-300" />
                            <span>Search Impressions</span>
                        </div>
                        <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">
                            {data.searchAppearances}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-400">Employer discover queries</p>
                    </div>

                    {/* Search Visibility Score */}
                    <div className="col-span-2 rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20 sm:col-span-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                            <Shield size={14} className="text-amber-500" />
                            <span>Visibility Index</span>
                        </div>
                        <p className="mt-2 text-xl font-black text-amber-900 dark:text-amber-200">
                            {data.visibilityScore}%
                        </p>
                        <p className="mt-0.5 text-[10px] text-amber-800/80 dark:text-amber-300">
                            Mode: {data.visibilityStatus}
                        </p>
                    </div>
                </div>

                {/* In-Demand Market Skills */}
                <div className="space-y-2 pt-1 border-t border-stone-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <TrendingUp size={14} className="text-emerald-500" />
                            Top Skills Employers Search For
                        </span>
                        <span className="text-[10px] text-slate-400">Market trends</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                        {data.topInDemandSkills.map((skill, i) => (
                            <span key={i} className="rounded-lg bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-stone-200 dark:border-slate-700">
                                🔥 {skill}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </SectionCard>
    );
}
