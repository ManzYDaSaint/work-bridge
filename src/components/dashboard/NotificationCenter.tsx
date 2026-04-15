"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, Check, ExternalLink, Inbox } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    link?: string;
    is_read: boolean;
    created_at: string;
}

export default function NotificationCenter() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const fetchNotifications = async () => {
        try {
            const res = await apiFetch("/api/notifications");
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        
        // Polling for new notifications every 2 minutes
        const interval = setInterval(fetchNotifications, 120000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const markAsRead = async (id: string) => {
        try {
            const res = await apiFetch("/api/notifications", {
                method: "PUT",
                body: JSON.stringify({ id }),
            });
            if (res.ok) {
                setNotifications(prev => 
                    prev.map(n => n.id === id ? { ...n, is_read: true } : n)
                );
            }
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const res = await apiFetch("/api/notifications", {
                method: "PUT",
                body: JSON.stringify({ all: true }),
            });
            if (res.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            }
        } catch (error) {
            console.error("Failed to mark all as read:", error);
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.is_read) {
            markAsRead(notification.id);
        }
        if (notification.link) {
            setIsOpen(false);
            router.push(notification.link);
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "relative flex h-9 w-9 items-center justify-center rounded-xl transition-all",
                    isOpen 
                        ? "bg-[#16324f] text-white shadow-lg" 
                        : "bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800"
                )}
            >
                <Bell size={18} className={cn(unreadCount > 0 && !isOpen && "animate-tada")} />
                {unreadCount > 0 && (
                    <span className={cn(
                        "absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2",
                        isOpen ? "ring-[#16324f]" : "ring-white dark:ring-slate-950"
                    )}>
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute right-0 top-full z-50 mt-3 w-80 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:w-96"
                    >
                        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-4 dark:border-slate-800">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
                            {unreadCount > 0 && (
                                <button 
                                    onClick={markAllAsRead}
                                    className="text-xs font-medium text-[#16324f] hover:underline dark:text-slate-400"
                                >
                                    Mark all as read
                                </button>
                            )}
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto">
                            {loading ? (
                                <div className="space-y-4 p-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="animate-pulse flex gap-3">
                                            <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
                                                <div className="h-3 w-full rounded bg-slate-100 dark:bg-slate-800" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="mb-4 rounded-full bg-slate-50 p-4 dark:bg-slate-900">
                                        <Inbox className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">All caught up!</p>
                                    <p className="mt-1 text-xs text-slate-400">No notifications yet.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-stone-50 dark:divide-slate-900">
                                    {notifications.map((n) => (
                                        <div 
                                            key={n.id}
                                            onClick={() => handleNotificationClick(n)}
                                            className={cn(
                                                "group relative flex cursor-pointer items-start gap-4 p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50",
                                                !n.is_read && "bg-blue-50/30 dark:bg-blue-900/5"
                                            )}
                                        >
                                            <div className={cn(
                                                "mt-1 h-2 w-2 shrink-0 rounded-full transition-all",
                                                n.is_read ? "bg-transparent" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                                            )} />
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className={cn(
                                                        "text-sm", 
                                                        n.is_read ? "font-medium text-slate-600 dark:text-slate-400" : "font-bold text-slate-900 dark:text-white"
                                                    )}>
                                                        {n.title}
                                                    </p>
                                                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                                        {timeAgo(n.created_at)}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                                    {n.message}
                                                </p>
                                                {n.link && (
                                                    <div className="mt-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#16324f] dark:text-slate-200">
                                                        View Details <ExternalLink size={10} />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {!n.is_read && (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        markAsRead(n.id);
                                                    }}
                                                    className="absolute right-2 top-11 opacity-0 group-hover:opacity-100 transition-opacity rounded-full p-1 text-slate-400 hover:text-green-600"
                                                    title="Mark as read"
                                                >
                                                    <Check size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
