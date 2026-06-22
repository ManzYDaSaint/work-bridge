"use client";

import { useState, useEffect } from "react";
import { Download, X, Share } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DISMISS_KEY = "wb_install_prompt_dismissed_until";

export default function InstallAppPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // 1. Don't show if already running as an installed app
        const isStandAloneMatch = window.matchMedia("(display-mode: standalone)").matches;
        const isIOSStandalone = (window.navigator as any).standalone === true;
        if (isStandAloneMatch || isIOSStandalone) return;

        // 2. Don't show if user dismissed recently (7-day cooldown)
        const dismissedUntil = localStorage.getItem(DISMISS_KEY);
        if (dismissedUntil && Date.now() < parseInt(dismissedUntil)) return;

        // 3. Detect iOS Safari (no beforeinstallprompt support)
        const ua = window.navigator.userAgent.toLowerCase();
        const iosDevice = /iphone|ipad|ipod/.test(ua);
        const isSafari = /safari/.test(ua) && !/chrome/.test(ua);
        setIsIOS(iosDevice);

        if (iosDevice && isSafari) {
            // Show iOS guidance hint after a brief delay
            const timer = setTimeout(() => setShowPrompt(true), 4000);
            return () => clearTimeout(timer);
        }

        // 4. Handle Android/Chrome/Desktop beforeinstallprompt
        const handlePrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Brief delay so it doesn't immediately fire on page load
            setTimeout(() => setShowPrompt(true), 2000);
        };

        window.addEventListener("beforeinstallprompt", handlePrompt);
        return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
    }, []);

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
        // Set a 7-day cooldown before showing again
        const sevenDays = Date.now() + 7 * 24 * 60 * 60 * 1000;
        localStorage.setItem(DISMISS_KEY, String(sevenDays));
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
                                {/* App icon */}
                                { }
                                <img
                                    src="/icons/icon-192.png"
                                    alt="Aganyu icon"
                                    className="w-12 h-12 rounded-2xl shadow-lg"
                                />
                                <div>
                                    <p className="text-sm font-black leading-none">Aganyu</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Free · No App Store needed</p>
                                </div>
                            </div>
                            {/* Fat-finger friendly dismiss button — 44x44px minimum touch target */}
                            <button
                                onClick={handleDismiss}
                                aria-label="Dismiss install prompt"
                                className="w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all shrink-0"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-5 pb-5 space-y-4">
                            <p className="text-sm text-slate-300 leading-relaxed">
                                {isIOS
                                    ? "Add Aganyu to your Home Screen for an app-like experience — no App Store required."
                                    : "Install Aganyu on your device for faster access, offline job browsing, and real-time notifications."}
                            </p>

                            {isIOS ? (
                                // iOS step-by-step instructions
                                <div className="bg-white/5 rounded-2xl p-4 space-y-3 border border-white/10">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">How to install on iOS</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                                            <Share className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <p className="text-sm text-slate-200">Tap the <strong>Share</strong> button at the bottom of Safari</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                                            <span className="text-blue-400 text-lg font-black leading-none">+</span>
                                        </div>
                                        <p className="text-sm text-slate-200">Select <strong>"Add to Home Screen"</strong> from the menu</p>
                                    </div>
                                </div>
                            ) : (
                                // Android/Chrome install button — full width, tall enough for thumbs
                                <button
                                    onClick={handleInstall}
                                    className="w-full h-14 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-sm font-black rounded-2xl transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-blue-900/40"
                                >
                                    <Download className="w-5 h-5" />
                                    Install App — It&apos;s Free
                                </button>
                            )}

                            <p className="text-center text-[11px] text-slate-600">
                                You won&apos;t be asked again for 7 days
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
