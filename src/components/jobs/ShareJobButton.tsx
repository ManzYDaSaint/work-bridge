"use client";

import { useState } from "react";
import { Share2, MessageCircle, Link2, Check } from "lucide-react";

interface ShareJobButtonProps {
    jobId: string;
    jobTitle: string;
    companyName?: string;
    location?: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL || "https://workbridge.co";

export default function ShareJobButton({ jobId, jobTitle, companyName, location }: ShareJobButtonProps) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const jobUrl = `${APP_URL}/jobs/${jobId}`;

    const waText = encodeURIComponent(
        `🚀 *${jobTitle}*${companyName ? ` at *${companyName}*` : ""}${location ? ` in ${location}` : ""}\n\nApply now on WorkBridge:\n${jobUrl}`
    );
    const whatsappUrl = `https://wa.me/?text=${waText}`;

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(jobUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback
            const el = document.createElement("textarea");
            el.value = jobUrl;
            document.body.appendChild(el);
            el.select();
            document.execCommand("copy");
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleNativeShare = async () => {
        if (typeof navigator !== "undefined" && navigator.share) {
            try {
                await navigator.share({
                    title: `${jobTitle}${companyName ? ` — ${companyName}` : ""}`,
                    text: `Check out this job: ${jobTitle}${companyName ? ` at ${companyName}` : ""}`,
                    url: jobUrl,
                });
                return;
            } catch {
                // user cancelled or not supported — fall through to menu
            }
        }
        setOpen(!open);
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={handleNativeShare}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-slate-300 text-slate-500 transition-all hover:border-slate-900 hover:text-slate-900 dark:border-slate-700 dark:hover:border-white dark:hover:text-white"
                aria-label="Share this job"
                title="Share"
            >
                <Share2 size={18} />
            </button>

            {open && (
                <>
                    {/* Backdrop to close */}
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

                    <div className="absolute bottom-14 right-0 z-50 min-w-[200px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                        <p className="border-b border-slate-100 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:border-slate-800">
                            Share this job
                        </p>

                        {/* WhatsApp */}
                        <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setOpen(false)}
                            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#25d366] text-white">
                                <MessageCircle size={16} />
                            </span>
                            Share on WhatsApp
                        </a>

                        {/* Copy Link */}
                        <button
                            type="button"
                            onClick={() => { handleCopyLink(); setOpen(false); }}
                            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {copied ? <Check size={16} className="text-emerald-600" /> : <Link2 size={16} />}
                            </span>
                            {copied ? "Copied!" : "Copy link"}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
