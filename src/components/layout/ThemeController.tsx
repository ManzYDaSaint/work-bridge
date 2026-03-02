"use client";

import { useEffect, useState } from "react";
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

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme") || "cupcake";
        setTheme(savedTheme);
        document.documentElement.setAttribute("data-theme", savedTheme);
    }, []);

    const handleThemeChange = (newTheme: string) => {
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);
    };

    return (
        <div className="dropdown dropdown-end group">
            <div
                tabIndex={0}
                role="button"
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-500 hover:text-blue-600 transition-all flex items-center justify-center border-none shadow-sm"
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
            </div>
            <ul
                tabIndex={0}
                className="dropdown-content mt-4 z-[100] p-2 shadow-2xl bg-white dark:bg-slate-900 rounded-[1.5rem] w-48 border border-slate-200 dark:border-slate-800 backdrop-blur-xl animate-fade-in-up"
            >
                <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 mb-2">
                    Visual Mode
                </div>
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
        </div>
    );
}
