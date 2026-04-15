"use client";

import { useEffect, useState, useRef } from "react";
import { Moon, Sun, Palette } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const themes = [
    { id: "light", icon: Sun },
    { id: "dark", icon: Moon },
    { id: "cupcake", icon: Palette }
];

export default function ThemeController() {
    const [theme, setTheme] = useState("cupcake");
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme") || "cupcake";
        setTheme(savedTheme);
        document.documentElement.setAttribute("data-theme", savedTheme);

        // Toggle dark class for Tailwind compatibility
        if (savedTheme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleThemeChange = (newTheme: string) => {
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);

        // Toggle dark class for Tailwind compatibility
        if (newTheme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }

        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-10 h-10 rounded-xl transition-all flex items-center justify-center border-none shadow-sm",
                    isOpen
                        ? "bg-blue-50 dark:bg-blue-900/40 text-blue-600 outline-none ring-2 ring-blue-500/20"
                        : "bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-500 hover:text-blue-600"
                )}
                aria-label="Toggle theme menu"
            >
                <motion.div
                    key={theme}
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                >
                    {theme === "dark" && <Moon size={18} strokeWidth={2.5} />}
                    {theme === "light" && <Sun size={18} strokeWidth={2.5} />}
                    {theme === "cupcake" && <Palette size={18} strokeWidth={2.5} />}
                </motion.div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute right-0 mt-3 z-[100] p-2 shadow-2xl bg-white dark:bg-slate-900 rounded-[1.5rem] w-48 border border-slate-200 dark:border-slate-800 backdrop-blur-xl"
                    >
                        <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 mb-2">
                            Visual Mode
                        </div>
                        <ul className="list-none p-0 m-0">
                            {themes.map((t) => (
                                <li key={t.id} className="mb-1 last:mb-0">
                                    <button
                                        onClick={() => handleThemeChange(t.id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                                            theme === t.id
                                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                        )}
                                    >
                                        <t.icon size={16} strokeWidth={theme === t.id ? 3 : 2} />
                                        <span className="capitalize">{t.id}</span>
                                        {theme === t.id && (
                                            <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
