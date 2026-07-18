"use client";

import Link from "next/link";
import { ExternalLink, Mail, MessageCircle, Phone, FileText } from "lucide-react";
import { ApplicationMethod } from "@/types";

export interface ApplyActionButtonProps {
    jobId: string;
    jobTitle: string;
    applicationMethod?: ApplicationMethod;
    externalApplyUrl?: string | null;
    applyEmail?: string | null;
    applyWhatsapp?: string | null;
    applyPhone?: string | null;
    applicationInstructions?: string | null;
    allowOneTapApply?: boolean;
    // Callbacks for the internal one-tap flow
    isApplied?: boolean;
    isProfileIncomplete?: boolean;
    isLimitReached?: boolean;
    canSubmitApplication?: boolean;
    onApply?: () => void;
    /** If provided, renders as a link rather than a button (for public / SSR pages) */
    applyHref?: string;
    compactMode?: boolean;
}

const BTN_BASE =
    "inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all sm:py-3.5";
const BTN_PRIMARY = `${BTN_BASE} bg-[#16324f] text-white hover:opacity-90`;
const BTN_OUTLINE = `${BTN_BASE} border-2 border-[#16324f] text-[#16324f] hover:bg-[#16324f]/5 dark:border-slate-400 dark:text-slate-200`;
const BTN_DISABLED = `${BTN_BASE} cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800`;

function buildWhatsAppLink(number: string, jobTitle: string) {
    const cleaned = number.replace(/\D/g, "");
    const text = encodeURIComponent(`Hi, I'm interested in applying for the ${jobTitle} position.`);
    return `https://wa.me/${cleaned}?text=${text}`;
}

/**
 * Smart apply CTA that renders the correct button(s) based on `application_method`
 * and `allow_one_tap_apply`. Supports both the seeker dashboard modal context and
 * the public-facing job page (pass `applyHref` for SSR-safe link rendering).
 */
export default function ApplyActionButton({
    jobId,
    jobTitle,
    applicationMethod = "one_tap",
    externalApplyUrl,
    applyEmail,
    applyWhatsapp,
    applyPhone,
    applicationInstructions,
    allowOneTapApply = true,
    isApplied,
    isProfileIncomplete,
    isLimitReached,
    canSubmitApplication = true,
    onApply,
    applyHref,
    compactMode = false,
}: ApplyActionButtonProps) {
    const showOneTap = allowOneTapApply && applicationMethod === "one_tap";
    const showOneTapAlongside = allowOneTapApply && applicationMethod !== "one_tap";

    // --- One-Tap Internal Apply button ---
    function OneTapButton({ outline = false }: { outline?: boolean }) {
        if (isApplied) {
            return (
                <div className={`${BTN_BASE} border border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20`}>
                    ✓ Applied
                </div>
            );
        }
        if (isProfileIncomplete) {
            return <button disabled className={BTN_DISABLED}>Complete Profile to Apply</button>;
        }
        if (isLimitReached) {
            return <button disabled className={BTN_DISABLED}>Monthly Limit Reached</button>;
        }
        if (applyHref) {
            return (
                <Link href={applyHref} className={outline ? BTN_OUTLINE : BTN_PRIMARY}>
                    Apply with Aganyu
                </Link>
            );
        }
        return (
            <button
                onClick={onApply}
                disabled={!canSubmitApplication}
                className={outline ? `${BTN_OUTLINE} disabled:opacity-50` : `${BTN_PRIMARY} disabled:opacity-50`}
            >
                Apply with Aganyu
            </button>
        );
    }

    // --- External URL ---
    if (applicationMethod === "external_url" && externalApplyUrl) {
        return (
            <div className={compactMode ? "flex gap-2" : "flex flex-col gap-3"}>
                <a
                    href={externalApplyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={BTN_PRIMARY}
                >
                    Apply on Employer Website <ExternalLink size={14} />
                </a>
                {showOneTapAlongside && <OneTapButton outline />}
            </div>
        );
    }

    // --- Email ---
    if (applicationMethod === "email" && applyEmail) {
        const subject = encodeURIComponent(`Application for ${jobTitle}`);
        const body = encodeURIComponent(`Dear Hiring Manager,\n\nI am writing to apply for the ${jobTitle} position.\n\nKind regards,`);
        return (
            <div className={compactMode ? "flex gap-2" : "flex flex-col gap-3"}>
                <a
                    href={`mailto:${applyEmail}?subject=${subject}&body=${body}`}
                    className={BTN_PRIMARY}
                >
                    <Mail size={16} /> Send Application Email
                </a>
                {showOneTapAlongside && <OneTapButton outline />}
            </div>
        );
    }

    // --- WhatsApp ---
    if (applicationMethod === "whatsapp" && applyWhatsapp) {
        return (
            <div className={compactMode ? "flex gap-2" : "flex flex-col gap-3"}>
                <a
                    href={buildWhatsAppLink(applyWhatsapp, jobTitle)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${BTN_BASE} bg-[#25d366] text-white hover:opacity-90`}
                >
                    <MessageCircle size={16} /> Apply via WhatsApp
                </a>
                {showOneTapAlongside && <OneTapButton outline />}
            </div>
        );
    }

    // --- Phone ---
    if (applicationMethod === "phone" && applyPhone) {
        return (
            <div className={compactMode ? "flex gap-2" : "flex flex-col gap-3"}>
                <a
                    href={`tel:${applyPhone}`}
                    className={BTN_PRIMARY}
                >
                    <Phone size={16} /> Call Employer
                </a>
                {showOneTapAlongside && <OneTapButton outline />}
            </div>
        );
    }

    // --- Manual Instructions ---
    if (applicationMethod === "manual") {
        return (
            <div className="space-y-3">
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                    <div className="mb-2 flex items-center gap-2">
                        <FileText size={14} className="text-slate-400" />
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">How to apply</p>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                        {applicationInstructions || "Please contact the employer directly to apply for this role."}
                    </p>
                </div>
                {showOneTapAlongside && <OneTapButton outline />}
            </div>
        );
    }

    // --- Default: One Tap ---
    if (showOneTap || applicationMethod === "one_tap") {
        return <OneTapButton />;
    }

    // Fallback: method configured but required data missing
    return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-300">
            Application details are being configured. Check back soon.
        </div>
    );
}
