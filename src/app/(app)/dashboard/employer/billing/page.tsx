"use client";

import { useEffect, useState } from "react";
import { apiFetchJson } from "@/lib/api";
import { CreditCard, Loader2, Briefcase, CalendarClock, CheckCircle } from "lucide-react";
import { PageHeader, SectionCard, Badge } from "@/components/dashboard/ui";
import { showErrorToast } from "@/lib/toasts";

const FREE_JOB_LIMIT = 3;

export default function EmployerBillingPage() {
    const [loading, setLoading] = useState(true);
    const [billingInfo, setBillingInfo] = useState<any>(null);
    const [activeJobCount, setActiveJobCount] = useState(0);
    const [upgrading, setUpgrading] = useState(false);

    const fetchBilling = async () => {
        try {
            const [billingRes, statsRes] = await Promise.all([
                apiFetchJson<Record<string, any>>("/api/employer/billing"),
                apiFetchJson<Record<string, any>>("/api/employer/stats"),
            ]);
            setBillingInfo(billingRes);
            setActiveJobCount((statsRes as any)?.activeJobs ?? 0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBilling();
    }, []);

    const handleUpgrade = async () => {
        setUpgrading(true);
        try {
            const res = await apiFetchJson<{ url?: string; error?: string }>("/api/checkout", {
                method: "POST",
            });
            if (res.url) {
                window.location.href = res.url;
            } else {
                showErrorToast(res.error || "Failed to initialize payment");
                setUpgrading(false);
            }
        } catch (err) {
            showErrorToast(err);
            setUpgrading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#16324f]" />
            </div>
        );
    }

    const isPremium = billingInfo?.plan === "PREMIUM";
    const planExpiresAt = billingInfo?.planExpiresAt ? new Date(billingInfo.planExpiresAt) : null;
    const daysLeft = planExpiresAt
        ? Math.max(0, Math.ceil((planExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null;
    const jobsUsed = activeJobCount;
    const jobsRemaining = Math.max(0, FREE_JOB_LIMIT - jobsUsed);
    const usagePercent = Math.min(100, Math.round((jobsUsed / FREE_JOB_LIMIT) * 100));

    return (
        <div className="space-y-6 pb-20">
            <PageHeader title="Billing" subtitle="Keep plan details and transaction history simple." />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <SectionCard title="Current plan">
                    <div className="space-y-5 p-6">
                        <div className="flex items-center gap-3">
                            <Badge label={isPremium ? "Premium" : "Free"} variant={isPremium ? "green" : "secondary"} />
                            {isPremium && daysLeft !== null && (
                                <span className={`text-xs font-semibold ${daysLeft <= 5 ? "text-rose-600" : "text-slate-400"}`}>
                                    {daysLeft}d left
                                </span>
                            )}
                        </div>

                        <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                            {isPremium ? "Premium workspace" : "Free workspace"}
                        </p>

                        {isPremium && planExpiresAt && (
                            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/30">
                                <CalendarClock size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <div>
                                    <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                                        Active until {planExpiresAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                                    </p>
                                    {daysLeft !== null && daysLeft <= 7 && (
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                                            Renew soon to avoid losing premium access.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Jobs usage — only relevant for free employers */}
                        {!isPremium && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                    <span className="flex items-center gap-1.5"><Briefcase size={12} /> Job slots used</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{jobsUsed} / {FREE_JOB_LIMIT}</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-slate-700">
                                    <div
                                        className={`h-full rounded-full transition-all ${usagePercent >= 100 ? "bg-rose-500" : usagePercent >= 66 ? "bg-amber-500" : "bg-emerald-500"}`}
                                        style={{ width: `${usagePercent}%` }}
                                    />
                                </div>
                                {jobsRemaining === 0 ? (
                                    <p className="text-xs font-semibold text-rose-600">You've used all free slots. Upgrade to post more roles.</p>
                                ) : (
                                    <p className="text-xs text-slate-400">{jobsRemaining} slot{jobsRemaining !== 1 ? "s" : ""} remaining on free plan.</p>
                                )}
                            </div>
                        )}

                        {/* Plan feature comparison */}
                        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 space-y-1.5">
                            <p className="font-semibold text-slate-800 dark:text-slate-100 mb-1">What changes by plan</p>
                            {[
                                { label: "Active job listings", free: "Up to 3", premium: "Unlimited" },
                                { label: "Candidate pipeline", free: "Basic", premium: "Full Kanban" },
                                { label: "Hiring insights", free: "—", premium: "Full metrics" },
                            ].map(({ label, free, premium }) => (
                                <div key={label} className="flex items-center justify-between gap-2">
                                    <span>{label}</span>
                                    <span className={`font-semibold ${isPremium ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200"}`}>
                                        {isPremium ? premium : free}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {!isPremium ? (
                            <button
                                onClick={handleUpgrade}
                                disabled={upgrading}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#16324f] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                            >
                                {upgrading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                                Upgrade to Premium
                            </button>
                        ) : (
                            <button
                                onClick={handleUpgrade}
                                disabled={upgrading}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-stone-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                            >
                                {upgrading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} className="text-emerald-600" />}
                                Renew Premium
                            </button>
                        )}
                    </div>
                </SectionCard>

                <div className="lg:col-span-2">
                    <SectionCard title="Transactions">
                        <div className="divide-y divide-stone-200/70 dark:divide-slate-800">
                            {billingInfo?.transactions?.length > 0 ? (
                                billingInfo.transactions.map((tx: any) => {
                                    const date = new Date(tx.created_at);
                                    return (
                                        <div key={tx.id} className="grid grid-cols-1 gap-3 px-6 py-4 sm:grid-cols-[minmax(0,2fr)_auto_auto] sm:items-center">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">Premium Plan — 30 days</p>
                                                <p className="mt-1 text-xs text-slate-400 font-mono">{tx.tx_ref}</p>
                                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                    {date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                                </p>
                                            </div>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                {tx.amount.toLocaleString()} {tx.currency}
                                            </p>
                                            <Badge label={tx.status} variant={tx.status === "SUCCESS" ? "green" : "slate"} />
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                                    <CreditCard className="text-slate-300 dark:text-slate-700" size={28} />
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">No transactions yet</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Your transaction history will appear here after your first payment.</p>
                                </div>
                            )}
                        </div>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
}
