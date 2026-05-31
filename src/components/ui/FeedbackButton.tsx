"use client";

import { MessageSquarePlus } from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export default function FeedbackButton() {
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    // Hide on certain routes (like login/register)
    if (pathname?.startsWith("/login") || pathname?.startsWith("/register")) {
        return null;
    }

    // Inside the dashboard the mobile bottom-nav is 60px tall,
    // so push the FAB above it (60 + 24 = 84px).
    const isDashboard = pathname?.startsWith("/dashboard");

    return (
        <a
            href="mailto:support@workbridge.mw?subject=Feedback%20or%20Bug%20Report"
            className={`fixed right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#16324f] text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all hover:scale-105 active:scale-95 dark:bg-white dark:text-slate-900 sm:right-8 group ${
                isDashboard
                    ? "bottom-[84px] md:bottom-8"
                    : "bottom-6 sm:bottom-8"
            }`}
            aria-label="Report a bug or give feedback"
        >
            <MessageSquarePlus size={24} />
            <span className="absolute right-full mr-4 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none dark:bg-slate-100 dark:text-slate-900 shadow-sm">
                Feedback & Bugs
            </span>
        </a>
    );
}
