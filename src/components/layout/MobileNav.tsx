"use client";

import { Briefcase, User, Bell, LogOut, LayoutDashboard } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Tab = "jobs" | "profile" | "notifications";

interface MobileNavProps {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
    unreadNotifications: number;
    onLogout: () => void;
}

const tabs = [
    { id: "jobs" as Tab, label: "Feed", icon: LayoutDashboard },
    { id: "profile" as Tab, label: "Me", icon: User },
    { id: "notifications" as Tab, label: "Pulse", icon: Bell },
];

export default function MobileNav({ activeTab, onTabChange, unreadNotifications, onLogout }: MobileNavProps) {
    return (
        <div className="md:hidden fixed bottom-6 left-6 right-6 z-50">
            <nav className="bg-slate-900/90 dark:bg-black/80 backdrop-blur-2xl border border-white/10 px-6 py-4 rounded-[2.5rem] flex justify-between items-center shadow-2xl shadow-black/40">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const badge = tab.id === "notifications" ? unreadNotifications : 0;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={cn(
                                "relative flex flex-col items-center gap-1.5 transition-all outline-none",
                                isActive ? "text-blue-500" : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            <motion.div
                                whileTap={{ scale: 0.9 }}
                                className={cn(
                                    "p-2.5 rounded-2xl transition-all",
                                    isActive ? "bg-blue-600/10" : "bg-transparent"
                                )}
                            >
                                <Icon size={24} strokeWidth={isActive ? 3 : 2} />
                            </motion.div>

                            {badge > 0 && (
                                <span className="absolute top-1 right-1 bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border-2 border-slate-900 shadow-sm animate-pulse">
                                    {badge}
                                </span>
                            )}
                            <span className={cn(
                                "text-[9px] font-black uppercase tracking-[0.15em] transition-all",
                                isActive ? "opacity-100 translate-y-0" : "opacity-40 translate-y-0.5"
                            )}>
                                {tab.label}
                            </span>

                            {isActive && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute -bottom-2 w-1 h-1 bg-blue-500 rounded-full"
                                />
                            )}
                        </button>
                    );
                })}

                <div className="h-8 w-px bg-white/5 mx-2" />

                <button
                    onClick={onLogout}
                    className="flex flex-col items-center gap-1.5 text-slate-500 hover:text-red-500 transition-colors group"
                >
                    <div className="p-2.5 rounded-2xl group-active:bg-red-500/10">
                        <LogOut size={22} className="group-active:-translate-x-1 transition-transform" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] opacity-40">Exit</span>
                </button>
            </nav>
        </div>
    );
}
