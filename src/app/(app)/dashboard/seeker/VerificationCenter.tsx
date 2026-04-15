"use client";

import { useState } from "react";
import { Shield, Upload, CheckCircle2, AlertCircle, Loader2, FileText } from "lucide-react";
import { uploadAndVerifyCertificate } from "./actions";
import { cn } from "@/lib/utils";
import { Badge, SectionCard } from "@/components/dashboard/ui";

interface VerificationCenterProps {
    topVerificationTier: number;
    full_name: string;
}

const TIERS = [
    "Certificate",
    "Diploma",
    "Bachelors",
    "Masters / Honours",
    "Doctorate",
];

export function VerificationCenter({ topVerificationTier, full_name }: VerificationCenterProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setUploading(true);
        setError(null);
        setSuccess(false);

        const formData = new FormData(e.currentTarget);
        const res = await uploadAndVerifyCertificate(formData);

        setUploading(false);
        if (res.error) {
            setError(res.error);
        } else if (res.success) {
            setSuccess(true);
            setTimeout(() => window.location.reload(), 2000);
        }
    };

    return (
        <SectionCard title="Verification">
            <div className="space-y-4 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-[#16324f] dark:bg-slate-800 dark:text-slate-200">
                            <Shield size={18} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                {topVerificationTier < 0 ? "Add your highest certificate" : `Verified as ${TIERS[topVerificationTier]}`}
                            </p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                {topVerificationTier < 0
                                    ? "Upload a PDF certificate to add trust signals to your profile."
                                    : `${full_name} has already passed certificate verification.`}
                            </p>
                        </div>
                    </div>
                    <Badge label={topVerificationTier >= 0 ? "Verified" : "Pending"} variant={topVerificationTier >= 0 ? "green" : "yellow"} />
                </div>

                <form onSubmit={handleUpload} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <input
                            name="title"
                            placeholder="Qualification title"
                            className="h-11 rounded-xl border border-stone-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-stone-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            required
                        />
                        <input
                            name="issuer"
                            placeholder="Institution"
                            className="h-11 rounded-xl border border-stone-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-stone-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            required
                        />
                    </div>

                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-5 transition-colors hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                            <Upload size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">Upload PDF certificate</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Only PDF files are supported for automated verification.</p>
                        </div>
                        <FileText size={16} className="text-slate-400" />
                        <input
                            type="file"
                            name="certificate"
                            accept=".pdf"
                            className="hidden"
                            required
                        />
                    </label>

                    {error && (
                        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    {success && (
                        <div className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
                            <CheckCircle2 size={16} /> Verification successful. Refreshing...
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={uploading}
                        className={cn(
                            "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-opacity",
                            uploading ? "cursor-not-allowed bg-stone-100 text-slate-400 dark:bg-slate-800" : "bg-[#16324f] text-white hover:opacity-90"
                        )}
                    >
                        {uploading ? <Loader2 className="animate-spin" size={16} /> : <Shield size={16} />}
                        {uploading ? "Verifying" : "Verify certificate"}
                    </button>
                </form>
            </div>
        </SectionCard>
    );
}
