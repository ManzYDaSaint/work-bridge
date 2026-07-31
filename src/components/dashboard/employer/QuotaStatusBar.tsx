"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Briefcase, Bookmark, TrendingUp } from "lucide-react";

interface QuotaData {
    discovery: { used: number; limit: number };
    activeJobs: { used: number; limit: number };
    savedCandidates: { used: number; limit: number };
}

function QuotaBar({ used, limit }: { used: number; limit: number }) {
    const pct = Math.min(Math.round((used / limit) * 100), 100);
    const color =
        pct >= 90
            ? "bg-red-500"
            : pct >= 70
            ? "bg-amber-500"
            : "bg-emerald-500";

    return (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-slate-700">
            <div
                className={`h-full rounded-full transition-all duration-500 ${color}`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

export default function QuotaStatusBar() {
    const [quota, setQuota] = useState<QuotaData | null>(null);

    useEffect(() => {
        fetch("/api/employer/quota")
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => data && setQuota(data))
            .catch(() => null);
    }, []);

    if (!quota) return null;

    const items = [
        {
            label: "AI Discoveries",
            icon: Sparkles,
            used: quota.discovery.used,
            limit: quota.discovery.limit,
        },
        {
            label: "Active Jobs",
            icon: Briefcase,
            used: quota.activeJobs.used,
            limit: quota.activeJobs.limit,
        },
        {
            label: "Saved Candidates",
            icon: Bookmark,
            used: quota.savedCandidates.used,
            limit: quota.savedCandidates.limit,
        },
    ];

    const atLimit = items.some((i) => i.used >= i.limit);

    return (
        <div className="mx-3 mb-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Plan Usage
                </span>
                {atLimit && (
                    <Link
                        href="/dashboard/employer/billing"
                        className="inline-flex items-center gap-1 rounded-lg bg-[#16324f] px-2 py-0.5 text-[10px] font-semibold text-white hover:opacity-90"
                    >
                        <TrendingUp size={10} />
                        Upgrade
                    </Link>
                )}
            </div>

            <div className="space-y-3">
                {items.map((item) => {
                    const Icon = item.icon;
                    const isAtLimit = item.used >= item.limit;
                    return (
                        <div key={item.label}>
                            <div className="mb-1 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <Icon
                                        size={11}
                                        className={
                                            isAtLimit
                                                ? "text-red-500"
                                                : "text-slate-400 dark:text-slate-500"
                                        }
                                    />
                                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                        {item.label}
                                    </span>
                                </div>
                                <span
                                    className={`text-[11px] font-semibold tabular-nums ${
                                        isAtLimit
                                            ? "text-red-500"
                                            : "text-slate-500 dark:text-slate-400"
                                    }`}
                                >
                                    {item.used}/{item.limit}
                                </span>
                            </div>
                            <QuotaBar used={item.used} limit={item.limit} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
