"use client";

import { useEffect, useState } from "react";
import { Sparkles, Briefcase, CheckCircle2, ArrowRight, X } from "lucide-react";
import Link from "next/link";

interface ClaimWelcomeBannerProps {
    companyName: string;
}

export function ClaimWelcomeBanner({ companyName }: ClaimWelcomeBannerProps) {
    const [dismissed, setDismissed] = useState(true);

    useEffect(() => {
        // Show once per session / account handover
        const key = `claim_welcome_dismissed_${companyName}`;
        if (!localStorage.getItem(key)) {
            setDismissed(false);
        }
    }, [companyName]);

    const handleDismiss = () => {
        localStorage.setItem(`claim_welcome_dismissed_${companyName}`, "true");
        setDismissed(true);
    };

    if (dismissed) return null;

    return (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/40 p-5 shadow-xs dark:border-emerald-900/50 dark:bg-emerald-950/20 relative overflow-hidden">
            <button
                type="button"
                onClick={handleDismiss}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition"
                aria-label="Dismiss banner"
            >
                <X size={16} />
            </button>

            <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                    <Sparkles size={20} />
                </div>

                <div className="space-y-1 pr-6">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                            Profile Claimed &amp; Linked
                        </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Welcome to Aganyu, {companyName}!
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                        Your official company account is connected to your existing vacancies. All previously sourced jobs and incoming candidate applications are now live in your workspace.
                    </p>

                    <div className="pt-2 flex flex-wrap items-center gap-3">
                        <Link
                            href="/dashboard/employer/jobs"
                            onClick={handleDismiss}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#16324f] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#16324f]/90"
                        >
                            <Briefcase size={13} /> View Your Jobs <ArrowRight size={12} />
                        </Link>
                        <Link
                            href="/dashboard/employer/settings"
                            onClick={handleDismiss}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                            Complete Company Profile
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
