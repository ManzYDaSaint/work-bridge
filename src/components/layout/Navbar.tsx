"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import ThemeController from "./ThemeController";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [user, setUser] = useState<any>(null);
    const supabase = createBrowserSupabaseClient();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);

        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };

        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => {
            window.removeEventListener("scroll", handleScroll);
            subscription.unsubscribe();
        };
    }, []);

    return (
        <header className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4 transition-all duration-300 pointer-events-none">
            <nav className={cn(
                "w-full max-w-7xl h-20 pointer-events-auto transition-all duration-500 rounded-[2rem] flex items-center px-6 md:px-10",
                isScrolled
                    ? "glass-effect scale-[0.98] mt-2 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border-white/20 dark:border-slate-800/50"
                    : "bg-transparent border-transparent"
            )}>
                <div className="flex-1">
                    <Link href="/" className="group flex items-center gap-4 no-underline transition-all">
                        <div className="relative">
                            <motion.div
                                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute -inset-2 bg-blue-500 rounded-2xl blur-lg -z-10"
                            />
                            <div className="w-12 h-12 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                <div className="logo-white">
                                    <Image
                                        src="/logo.svg"
                                        alt="WorkBridge"
                                        width={48}
                                        height={48}
                                        priority
                                    />
                                </div>
                                <div className="logo-black">
                                    <Image
                                        src="/logo-black.svg"
                                        alt="WorkBridge"
                                        width={48}
                                        height={48}
                                        priority
                                    />
                                </div>
                            </div>
                        </div>
                        <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors hidden sm:block">
                            WorkBridge
                        </span>
                    </Link>
                </div>

                <div className="flex-none gap-4 md:gap-8 flex items-center">
                    <Link
                        href="/jobs"
                        className="md:hidden text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    >
                        Jobs
                    </Link>
                    <ul className="hidden md:flex items-center gap-8 list-none m-0 p-0 text-sm font-medium text-slate-600 dark:text-slate-400">
                        <li>
                            <Link href="/jobs" className="hover:text-slate-900 dark:hover:text-white transition-colors no-underline">
                                Jobs
                            </Link>
                        </li>
                        <li>
                            <Link href="/#pricing" className="hover:text-slate-900 dark:hover:text-white transition-colors no-underline">
                                Pricing
                            </Link>
                        </li>
                    </ul>
                    <div className="flex items-center gap-4">
                        <ThemeController />
                        {user ? (
                            <Link
                                href="/dashboard"
                                className="relative h-12 px-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] overflow-hidden group shadow-2xl active:scale-95 transition-all flex items-center justify-center border border-white/10"
                            >
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"
                                />
                                <span className="relative z-10 flex items-center gap-2">
                                    Open Hub
                                    <motion.div
                                        animate={{ x: [0, 5, 0] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    >
                                        →
                                    </motion.div>
                                </span>
                            </Link>
                        ) : (
                            <div className="flex items-center gap-4">
                                <Link
                                    href="/login"
                                    className="relative h-12 px-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] overflow-hidden group shadow-2xl active:scale-95 transition-all flex items-center justify-center border border-white/10"
                                >
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"
                                    />
                                    <span className="relative z-10 flex items-center gap-2">
                                        Log In
                                        <motion.div
                                            animate={{ x: [0, 5, 0] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                        >
                                            →
                                        </motion.div>
                                    </span>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </nav>
        </header>
    );
}
