"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Download, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useOptionalUser } from "@/context/UserContext";

const DISMISS_KEY = "wb_employer_pwa_dismissed_until";

export default function InstallAppPrompt() {
    const pathname = usePathname();
    const userContext = useOptionalUser();
    const user = userContext?.user;

    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        // STRICT RULE: Only show desktop PWA prompt to EMPLOYER accounts
        // while they are actively navigating employer dashboard workspace.
        if (!user || user.role !== "EMPLOYER") {
            setShowPrompt(false);
            return;
        }

        if (!pathname?.startsWith("/dashboard/employer")) {
            setShowPrompt(false);
            return;
        }

        // 1. Don't show if already running as an installed standalone app
        const isStandAloneMatch = window.matchMedia("(display-mode: standalone)").matches;
        if (isStandAloneMatch) return;

        // 2. Only target desktop / larger screens for Employers (width >= 1024px)
        if (window.innerWidth < 1024) return;

        // 3. Don't show if user dismissed recently (14-day cooldown)
        const dismissedUntil = localStorage.getItem(DISMISS_KEY);
        if (dismissedUntil && Date.now() < parseInt(dismissedUntil)) return;

        // 4. Handle Desktop Chrome/Edge beforeinstallprompt
        const handlePrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setTimeout(() => setShowPrompt(true), 3000);
        };

        window.addEventListener("beforeinstallprompt", handlePrompt);
        return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
    }, [user?.role, user?.id, pathname]);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            setShowPrompt(false);
            setDeferredPrompt(null);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // Set a 14-day cooldown before showing again to avoid recruiter annoyance
        const fourteenDays = Date.now() + 14 * 24 * 60 * 60 * 1000;
        localStorage.setItem(DISMISS_KEY, String(fourteenDays));
    };

    return (
        <AnimatePresence>
            {showPrompt && (
                <motion.div
                    key="install-prompt"
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    transition={{ type: "spring", damping: 28, stiffness: 280 }}
                    // pb-safe ensures the banner clears the iPhone home bar / Android gesture nav
                    className="fixed bottom-0 left-0 right-0 z-50 px-4 pt-4 pb-4"
                    style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
                >
                    <div className="bg-slate-900 text-white rounded-3xl shadow-2xl border border-white/10 overflow-hidden max-w-lg mx-auto">
                        {/* Header strip */}
                        <div className="flex items-center justify-between px-5 pt-5 pb-3">
                            <div className="flex items-center gap-3">
                                <img
                                    src="/icons/icon-192.png"
                                    alt="Aganyu icon"
                                    className="w-10 h-10 rounded-xl shadow-md"
                                />
                                <div>
                                    <p className="text-sm font-bold leading-none text-white">Aganyu Recruiter Desktop</p>
                                    <p className="text-[11px] text-slate-400 mt-1">Dedicated ATS workspace for hiring managers</p>
                                </div>
                            </div>
                            <button
                                onClick={handleDismiss}
                                aria-label="Dismiss install prompt"
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all shrink-0"
                            >
                                <X className="w-4 h-4 text-slate-300" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-5 pb-5 space-y-3">
                            <p className="text-xs text-slate-300 leading-relaxed">
                                Install Aganyu on your desktop for 1-click access to candidate applications, scorecards, and talent pools.
                            </p>

                            <button
                                onClick={handleInstall}
                                className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-900/30"
                            >
                                <Download className="w-4 h-4" />
                                Install Desktop App
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
