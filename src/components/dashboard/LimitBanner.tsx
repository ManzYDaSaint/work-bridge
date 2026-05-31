"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetchJson } from "@/lib/api";

interface LimitBannerProps {
    message: string;
    featureRequested: string;
    className?: string;
}

/**
 * Soft-wall banner shown when a free-tier usage limit is reached.
 * Includes a frictionless 1-click CTA to join the early access waitlist.
 */
export default function LimitBanner({ message, featureRequested, className = "" }: LimitBannerProps) {
    const [loading, setLoading] = useState(false);
    const [requested, setRequested] = useState(false);

    const handleRequestAccess = async () => {
        setLoading(true);
        try {
            const res = await apiFetchJson<any>("/api/early-access", {
                method: "POST",
                body: JSON.stringify({ featureRequested })
            });

            if (res.error) throw new Error(res.error);
            
            setRequested(true);
            toast.success("You've been added to the early access waitlist!");
        } catch (e: any) {
            toast.error(e.message || "Failed to request access");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm dark:border-amber-900/40 dark:bg-amber-950/20 ${className}`}
        >
            <div className="flex items-start gap-3">
                <AlertCircle
                    size={18}
                    className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400"
                />
                <div>
                    <p className="font-semibold text-amber-900 dark:text-amber-200">
                        Free limit reached
                    </p>
                    <p className="mt-0.5 text-amber-800 dark:text-amber-300/80">
                        {message}
                    </p>
                </div>
            </div>
            
            <div className="flex-shrink-0 ml-7 sm:ml-0">
                <button
                    onClick={handleRequestAccess}
                    disabled={loading || requested}
                    className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-70 disabled:cursor-not-allowed min-w-[140px]"
                >
                    {loading ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : requested ? (
                        "On the Waitlist"
                    ) : (
                        "Request Early Access"
                    )}
                </button>
            </div>
        </div>
    );
}
