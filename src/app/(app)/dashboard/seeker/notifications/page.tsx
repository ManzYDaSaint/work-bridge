"use client";

import { useEffect, useState } from "react";
import { Bell, Briefcase, CheckCircle2, MessageSquare, Zap, Loader2 } from "lucide-react";
import { AppNotification } from "@/types";
import { PageHeader, SectionCard } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

// Local type removed in favor of AppNotification from @/types

// Map notification types to icons
const getIcon = (type?: string) => {
    switch (type) {
        case "JOB_MATCH":
        case "SUCCESS": return { icon: Briefcase, color: "text-blue-600 bg-blue-50" };
        case "APPLICATION_VIEWED": return { icon: CheckCircle2, color: "text-green-600 bg-green-50" };
        case "MESSAGE": return { icon: MessageSquare, color: "text-purple-500 bg-purple-50" };
        case "TIP": return { icon: Zap, color: "text-orange-500 bg-orange-50" };
        default: return { icon: Bell, color: "text-slate-500 bg-slate-50" };
    }
};

const formatTimeAgo = (dateString: string) => {
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    const diff = new Date().getTime() - new Date(dateString).getTime();
    const days = Math.round(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days < 30) return rtf.format(-days, "day");
    return new Date(dateString).toLocaleDateString();
};

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState<string | null>(null);

    const fetchNotifications = async () => {
        try {
            const res = await apiFetch("/api/notifications");
            const data: AppNotification[] = await res.json();
            setNotifications(data || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const markAllRead = async () => {
        // Optimistic UI update
        setNotifications(notifications.map((n: AppNotification) => ({ ...n, isRead: true })));
    };

    const handleQuickApply = async (notificationId: string, jobId: string) => {
        setApplying(notificationId);
        try {
            const res = await apiFetch("/api/applications", {
                method: "POST",
                body: JSON.stringify({ jobId }),
                headers: { "Content-Type": "application/json" }
            });

            if (res.ok) {
                // Remove or update the notification once applied
                setNotifications(notifications.map((n: AppNotification) =>
                    n.id === notificationId ? { ...n, message: "Applied successfully! ✅", type: "APPLICATION_VIEWED", isRead: true } : n
                ));
            }
        } finally {
            setApplying(null);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Intelligence Feed"
                subtitle="High-impact alerts and strategic career matches"
                action={{
                    label: "Mark all as read",
                    variant: "secondary",
                    onClick: markAllRead
                }}
            />

            <SectionCard title="Recent Activity">
                {loading ? (
                    <div className="p-20 text-center flex flex-col items-center gap-4">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Scanning Network...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-20 text-center text-slate-500 flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-200">
                            <Bell size={32} />
                        </div>
                        <div className="space-y-1">
                            <p className="font-black text-slate-700 uppercase tracking-tight">Signal Silence</p>
                            <p className="text-xs font-medium text-slate-400">No new career intelligence detected in your area.</p>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {notifications.map((n: AppNotification) => {
                            const ui = getIcon(n.type);
                            const isEliteMatch = n.type === 'SUCCESS' && n.jobId;

                            return (
                                <div key={n.id} className={cn(
                                    "flex flex-col md:flex-row md:items-center gap-6 px-8 py-6 transition-all",
                                    !n.isRead ? "bg-blue-50/30 dark:bg-blue-900/5 shadow-inner" : "hover:bg-slate-50/50"
                                )}>
                                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm", ui.color)}>
                                        <ui.icon size={22} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3">
                                            <p className={cn("text-sm font-bold text-slate-900 dark:text-white line-clamp-2", !n.isRead ? "text-blue-900" : "")}>
                                                {n.message}
                                            </p>
                                            {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 animate-pulse" />}
                                        </div>
                                        <div className="flex items-center gap-4 mt-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                {formatTimeAgo(n.createdAt)}
                                            </span>
                                            {isEliteMatch && (
                                                <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg">High Precision</span>
                                            )}
                                        </div>
                                    </div>

                                    {isEliteMatch && !n.isRead && (
                                        <div className="flex-shrink-0 flex items-center gap-3">
                                            <button
                                                disabled={applying === n.id}
                                                onClick={() => n.jobId && handleQuickApply(n.id, n.jobId)}
                                                className="h-10 px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 dark:hover:bg-blue-500 transition-all flex items-center gap-2 shadow-lg active:scale-95 disabled:opacity-50"
                                            >
                                                {applying === n.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap size={14} className="fill-current" />}
                                                Quick Apply
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </SectionCard>
        </div>
    );
}

