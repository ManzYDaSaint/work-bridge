"use client";

import { useState } from "react";
import { Share2, MessageCircle, Link2, Check, Linkedin, Mail, Send } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface ShareJobButtonProps {
    jobId: string;
    jobTitle: string;
    publicSlug?: string;
    companyName?: string;
    location?: string;
    workMode?: string;
    salaryRange?: string;
    jobType?: string;
}

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL || "https://aganyu.com").replace(/\/$/, "");

function formatWorkModeLabel(mode?: string) {
    if (!mode) return "";
    return mode.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatJobTypeLabel(type?: string) {
    if (!type) return "";
    return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ShareJobButton({
    jobId,
    jobTitle,
    publicSlug,
    companyName,
    location,
    workMode,
    salaryRange,
    jobType,
}: ShareJobButtonProps) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    // Prefer the public slug for a cleaner, SEO-friendly URL
    const jobPath = publicSlug || jobId;
    const jobUrl = `${APP_URL}/jobs/${jobPath}`;

    /** Build a UTM-tagged URL for each share channel */
    const buildShareUrl = (channel: string) => {
        const url = new URL(jobUrl);
        url.searchParams.set("utm_source", channel);
        url.searchParams.set("utm_medium", "social");
        url.searchParams.set("utm_campaign", "job_share");
        return url.toString();
    };

    /** Fire-and-forget analytics event */
    const trackShare = (channel: string) => {
        apiFetch("/api/metrics/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                eventName: "job_shared",
                metadata: { jobId, channel },
            }),
        }).catch(() => undefined);
    };

    // ─── WhatsApp ──────────────────────────────────────────────
    // Rich, structured message that reads well with WhatsApp bold formatting.
    // The URL at the end triggers WhatsApp's OG link-preview card
    // (pulls og:title, og:description, og:image from our /jobs/[id] page).
    const waUrl = buildShareUrl("whatsapp");
    const waLines = [
        `🚀 *${jobTitle}*`,
        companyName ? `🏢 *${companyName}*` : "",
        location ? `📍 ${location}` : "",
        workMode ? `🏠 ${formatWorkModeLabel(workMode)}` : "",
        jobType ? `📋 ${formatJobTypeLabel(jobType)}` : "",
        salaryRange ? `💰 ${salaryRange}` : "",
        "",
        "Apply now on Aganyu 👇",
        waUrl,
    ].filter(Boolean).join("\n");
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(waLines)}`;

    // ─── LinkedIn ──────────────────────────────────────────────
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(buildShareUrl("linkedin"))}`;

    // ─── X (Twitter) ───────────────────────────────────────────
    const tweetText = `${jobTitle}${companyName ? ` at ${companyName}` : ""}${location ? ` · ${location}` : ""}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(buildShareUrl("twitter"))}`;

    // ─── Telegram ──────────────────────────────────────────────
    const telegramText = `${jobTitle}${companyName ? ` at ${companyName}` : ""}${location ? ` — ${location}` : ""}`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(buildShareUrl("telegram"))}&text=${encodeURIComponent(telegramText)}`;

    // ─── Email ─────────────────────────────────────────────────
    const emailSubject = `Job opportunity: ${jobTitle}${companyName ? ` at ${companyName}` : ""}`;
    const emailBody = [
        `Hi,`,
        ``,
        `I thought you might be interested in this opportunity:`,
        ``,
        `${jobTitle}${companyName ? ` at ${companyName}` : ""}`,
        location ? `Location: ${location}` : "",
        workMode ? `Work mode: ${formatWorkModeLabel(workMode)}` : "",
        salaryRange ? `Compensation: ${salaryRange}` : "",
        ``,
        `View & apply: ${buildShareUrl("email")}`,
        ``,
        `— shared via Aganyu`,
    ].filter(Boolean).join("\n");
    const emailUrl = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(buildShareUrl("copy_link"));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const el = document.createElement("textarea");
            el.value = buildShareUrl("copy_link");
            document.body.appendChild(el);
            el.select();
            document.execCommand("copy");
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
        trackShare("copy_link");
    };

    const handleNativeShare = async () => {
        if (typeof navigator !== "undefined" && navigator.share) {
            try {
                await navigator.share({
                    title: `${jobTitle}${companyName ? ` — ${companyName}` : ""}`,
                    text: `Check out this job: ${jobTitle}${companyName ? ` at ${companyName}` : ""}`,
                    url: buildShareUrl("native_share"),
                });
                trackShare("native_share");
                return;
            } catch {
                // user cancelled or not supported — fall through to dropdown
            }
        }
        setOpen(!open);
    };

    const channels = [
        {
            label: "WhatsApp",
            href: whatsappUrl,
            icon: <MessageCircle size={16} />,
            bg: "bg-[#25d366]",
            channel: "whatsapp",
        },
        {
            label: "LinkedIn",
            href: linkedInUrl,
            icon: <Linkedin size={16} />,
            bg: "bg-[#0a66c2]",
            channel: "linkedin",
        },
        {
            label: "X (Twitter)",
            href: twitterUrl,
            icon: (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
            ),
            bg: "bg-black dark:bg-white dark:text-black",
            channel: "twitter",
        },
        {
            label: "Telegram",
            href: telegramUrl,
            icon: <Send size={16} />,
            bg: "bg-[#0088cc]",
            channel: "telegram",
        },
        {
            label: "Email",
            href: emailUrl,
            icon: <Mail size={16} />,
            bg: "bg-slate-600",
            channel: "email",
        },
    ];

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

                    <div className="absolute bottom-14 right-0 z-50 min-w-[220px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                        <p className="border-b border-slate-100 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:border-slate-800">
                            Share this job
                        </p>

                        {channels.map(({ label, href, icon, bg, channel }) => (
                            <a
                                key={channel}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => { setOpen(false); trackShare(channel); }}
                                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                                <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-white ${bg}`}>
                                    {icon}
                                </span>
                                {label}
                            </a>
                        ))}

                        {/* Divider */}
                        <div className="border-t border-slate-100 dark:border-slate-800" />

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
