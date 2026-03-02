"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Notification } from "@/types";
import { Bell, Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

function getIcon(type?: string) {
    switch (type) {
        case "SUCCESS": return <CheckCircle className="text-green-500" size={18} />;
        case "WARNING": return <AlertTriangle className="text-amber-500" size={18} />;
        case "ERROR": return <XCircle className="text-red-500" size={18} />;
        default: return <Info className="text-blue-500" size={18} />;
    }
}

interface NotificationDropdownProps {
    isMobile?: boolean;
}

export default function NotificationDropdown({ isMobile = false }: NotificationDropdownProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const unreadCount = notifications.filter((n) => !n.isRead).length;

    const fetchNotifications = async () => {
        try {
            const res = await apiFetch("/notifications");
            const data: Notification[] = await res.json();
            setNotifications(data);
            setLoaded(true);
        } catch { /* silent */ }
    };

    const markAsRead = async (id: string) => {
        try {
            await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
            setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
        } catch { /* silent */ }
    };

    const handleOpen = () => {
        if (!loaded) fetchNotifications();
        setIsOpen((v) => !v);
    };

    const NotificationList = () => (
        <div className={cn("flex flex-col", !isMobile && "max-h-[400px] overflow-y-auto")}>
            {notifications.length === 0 ? (
                <div className="py-20 px-8 text-center">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <Bell size={24} />
                    </div>
                    <p className="text-slate-400 text-sm font-medium">No activity reported yet.</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.map((n) => (
                        <div
                            key={n.id}
                            onClick={() => !n.isRead && markAsRead(n.id)}
                            className={cn(
                                "p-5 cursor-pointer flex items-start gap-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50",
                                !n.isRead && "bg-blue-50/30 dark:bg-blue-900/10"
                            )}
                        >
                            <div className="mt-1 flex-shrink-0">{getIcon(n.type)}</div>
                            <div className="flex-1 min-w-0">
                                <p className={cn(
                                    "text-sm leading-relaxed",
                                    n.isRead ? "text-slate-600 dark:text-slate-400 font-medium" : "text-slate-900 dark:text-white font-black"
                                )}>
                                    {n.message}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-2 font-black uppercase tracking-wider">
                                    {new Date(n.createdAt).toLocaleTimeString()}
                                </p>
                            </div>
                            {!n.isRead && (
                                <div className="mt-2 w-2 h-2 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    if (isMobile) return <NotificationList />;

    return (
        <div className="relative">
            <button
                onClick={handleOpen}
                className={cn(
                    "relative p-3 rounded-xl transition-all group",
                    isOpen ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600"
                )}
                aria-label="Notifications"
            >
                <Bell size={20} className={cn(isOpen ? "scale-110" : "group-hover:rotate-12 transition-transform")} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border-2 border-white dark:border-slate-900 shadow-sm animate-pulse">
                        {unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40 bg-black/5" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="absolute right-0 mt-4 w-[360px] bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                                <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Notifications</span>
                                {unreadCount > 0 && (
                                    <span className="px-2 py-1 bg-blue-600 text-white text-[10px] font-black rounded-lg">
                                        {unreadCount} New
                                    </span>
                                )}
                            </div>
                            <NotificationList />
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                                <button className="w-full py-2 text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:underline">
                                    View Repository History
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
