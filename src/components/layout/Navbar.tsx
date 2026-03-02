"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ThemeController from "./ThemeController";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
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
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-2xl shadow-blue-500/40 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                W
                            </div>
                        </div>
                        <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                            WorkBridge
                        </span>
                    </Link>
                </div>

                <div className="flex-none gap-8 flex items-center">
                    <ul className="hidden md:flex items-center gap-10 list-none m-0 p-0 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        <li>
                            <Link href="/pricing" className="hover:text-blue-600 dark:hover:text-white transition-all no-underline flex items-center gap-2 group">
                                <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full group-hover:scale-[3] group-hover:bg-blue-600 transition-all" />
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
