"use client";

import { useState } from "react";
import { ShieldCheck, Sparkles, Loader2, CheckCircle2, Star } from "lucide-react";
import { initializeBadgePayment, initializePlusSubscriptionPayment } from "./actions";
import { Badge, SectionCard } from "@/components/dashboard/ui";

interface PremiumVerificationProps {
    hasBadge?: boolean;
    isSubscribed?: boolean;
    badgeSeekerNumber?: number;
}

export function PremiumVerification({ hasBadge = false, isSubscribed = false, badgeSeekerNumber }: PremiumVerificationProps) {
    const [loadingBadge, setLoadingBadge] = useState(false);
    const [loadingAI, setLoadingAI] = useState(false);

    const handleBadgePayment = async () => {
        setLoadingBadge(true);
        try {
            const res = await initializeBadgePayment();
            if (res.success && res.url) {
                window.location.href = res.url;
            } else {
                alert(res.error || "Payment failed to initialize");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingBadge(false);
        }
    };

    const handlePlusPayment = async () => {
        setLoadingAI(true);
        try {
            const res = await initializePlusSubscriptionPayment();
            if (res.success && res.url) {
                window.location.href = res.url;
            } else {
                alert(res.error || "Payment failed to initialize");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingAI(false);
        }
    };

    return (
        <SectionCard title="Plans and upgrades">
            <div className="grid gap-4 p-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                <Star size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">WorkBridge badge</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Trusted profile identity for employers.</p>
                            </div>
                        </div>
                        <Badge label={hasBadge ? "Active" : "Optional"} variant={hasBadge ? "green" : "slate"} />
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-3">
                        <div>
                            <p className="text-2xl font-semibold text-slate-900 dark:text-white">MK3,000</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                One-time payment. {badgeSeekerNumber ? `Badge number #${badgeSeekerNumber}.` : "First 100 seekers may receive it free."}
                            </p>
                        </div>
                        <button
                            onClick={handleBadgePayment}
                            disabled={loadingBadge || hasBadge}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#16324f] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-green-50 disabled:text-green-700"
                        >
                            {loadingBadge ? <Loader2 size={16} className="animate-spin" /> : hasBadge ? <CheckCircle2 size={16} /> : <ShieldCheck size={16} />}
                            {hasBadge ? "Active" : "Get badge"}
                        </button>
                    </div>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                                <Sparkles size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">WorkBridge Plus</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">More applications and premium job-seeker visibility.</p>
                            </div>
                        </div>
                        <Badge label={isSubscribed ? "Active" : "Monthly"} variant={isSubscribed ? "green" : "slate"} />
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-3">
                        <div>
                            <p className="text-2xl font-semibold text-slate-900 dark:text-white">MK2,000</p>
                             <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Monthly payment via PayChangu.</p>
                        </div>
                        <button
                            onClick={handlePlusPayment}
                            disabled={loadingAI || isSubscribed}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:bg-green-50 disabled:text-green-700 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            {loadingAI ? <Loader2 size={16} className="animate-spin" /> : isSubscribed ? <CheckCircle2 size={16} /> : <Sparkles size={16} />}
                            {isSubscribed ? "Active" : "Activate Plus"}
                        </button>
                    </div>
                </div>
            </div>
        </SectionCard>
    );
}
