"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ThemeController from "./ThemeController";
import { cn } from "@/lib/utils";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";

import { Menu, X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function usePostJobHref(user: { id: string } | null, role: string | null) {
    return useMemo(() => {
        if (!user) return "/register?role=employer";
        if (role === "EMPLOYER") return "/dashboard/employer/jobs/new";
        if (role === "ADMIN") return "/dashboard/admin";
        return "/register?role=employer";
    }, [user, role]);
}

export default function MarketingNavbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [user, setUser] = useState<{ id: string } | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const supabase = createBrowserSupabaseClient();

    useEffect(() => {
        setMounted(true);
        const onScroll = () => setIsScrolled(window.scrollY > 12);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        const load = async () => {
            const {
                data: { user: u },
            } = await supabase.auth.getUser();
            setUser(u ? { id: u.id } : null);
            if (!u) {
                setRole(null);
                return;
            }
            const { data } = await supabase.from("users").select("role").eq("id", u.id).single();
            setRole(data?.role ?? null);
        };
        load();
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(() => {
            load();
        });
        return () => subscription.unsubscribe();
    }, [supabase, mounted]);

    const postJobHref = usePostJobHref(user, role);

    return (
        <header className="sticky top-0 z-50 flex flex-col items-center px-3 sm:px-4 pt-3 sm:pt-4">
            <nav
                className={cn(
                    "w-full max-w-6xl flex items-center justify-between gap-x-3 sm:gap-4 min-h-12 sm:min-h-14 px-3 sm:px-5 py-2 rounded-[1.25rem] border transition-colors relative z-50",
                    isScrolled || isMenuOpen
                        ? "bg-[#fbf8f1]/90 dark:bg-slate-900/90 backdrop-blur-md border-stone-200/80 dark:border-slate-700 shadow-sm"
                        : "bg-[#fbf8f1]/70 dark:bg-slate-900/60 backdrop-blur-sm border-stone-200/60 dark:border-slate-800/80"
                )}
            >
                <Link href="/" className="flex items-center gap-2 sm:gap-2.5 shrink-0 no-underline min-w-0" onClick={() => setIsMenuOpen(false)}>
                    <div className="logo-black">
                        <Image
                            src="/logo-black.svg"
                            alt=""
                            width={36}
                            height={36}
                            className="shrink-0"
                            priority
                        />
                    </div>
                    <div className="logo-white">
                        <Image
                            src="/logo.svg"
                            alt=""
                            width={36}
                            height={36}
                            className="shrink-0"
                            priority
                        />
                    </div>
                    <span className="text-base sm:text-lg font-semibold tracking-tight text-slate-900 dark:text-white truncate hidden sm:block">
                        WorkBridge
                    </span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden flex-1 min-w-0 md:flex items-center justify-end gap-2 sm:gap-5 text-sm shrink-0">
                    <div className="flex items-center gap-3 sm:gap-5 text-slate-600 dark:text-slate-400 font-medium">
                        <Link href="/jobs" className="hover:text-slate-900 dark:hover:text-white whitespace-nowrap">
                            Jobs
                        </Link>
                        <Link href={postJobHref} className="hover:text-slate-900 dark:hover:text-white whitespace-nowrap">
                            Post a job
                        </Link>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {user ? (
                            <Link
                                href="/dashboard"
                                className="px-3 sm:px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90 transition-opacity whitespace-nowrap"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/register"
                                    className="px-3 sm:px-4 py-2 rounded-xl bg-[#16324f] dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90 transition-opacity whitespace-nowrap"
                                >
                                    Sign up
                                </Link>
                            </>
                        )}
                        <ThemeController />
                    </div>
                </div>

                {/* Mobile Controls */}
                <div className="flex items-center gap-2 md:hidden">
                    <ThemeController />
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Toggle menu"
                    >
                        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-x-3 sm:inset-x-4 top-[calc(100%+0.5rem)] z-40 md:hidden"
                    >
                        <div className="rounded-[1.5rem] border border-stone-200/80 bg-[#fbf8f1]/95 px-5 py-6 shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95 overflow-hidden">
                            <div className="flex flex-col gap-4">
                                <Link 
                                    href="/jobs" 
                                    onClick={() => setIsMenuOpen(false)}
                                    className="flex items-center justify-between text-lg font-semibold text-slate-900 dark:text-white px-2 py-1"
                                >
                                    Browse Jobs
                                    <ChevronRight size={18} className="text-slate-400" />
                                </Link>
                                <Link 
                                    href={postJobHref} 
                                    onClick={() => setIsMenuOpen(false)}
                                    className="flex items-center justify-between text-lg font-semibold text-slate-900 dark:text-white px-2 py-1"
                                >
                                    Post a Job
                                    <ChevronRight size={18} className="text-slate-400" />
                                </Link>
                                
                                <div className="h-px bg-stone-200 dark:bg-slate-800 my-2" />
                                
                                {user ? (
                                    <Link
                                        href="/dashboard"
                                        onClick={() => setIsMenuOpen(false)}
                                        className="w-full flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-base font-semibold text-white dark:bg-white dark:text-slate-900 shadow-sm"
                                    >
                                        Go to Dashboard
                                    </Link>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        <Link
                                            href="/login"
                                            onClick={() => setIsMenuOpen(false)}
                                            className="flex items-center justify-center rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                        >
                                            Log in
                                        </Link>
                                        <Link
                                            href="/register"
                                            onClick={() => setIsMenuOpen(false)}
                                            className="flex items-center justify-center rounded-xl bg-[#16324f] px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-900 shadow-sm"
                                        >
                                            Sign up
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
