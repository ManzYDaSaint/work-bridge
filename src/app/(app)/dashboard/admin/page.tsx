"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Users, Briefcase, ShieldCheck, BarChart3, TrendingUp, UserCheck, Loader2, Activity, Zap } from "lucide-react";
import { PageHeader, StatCard, SectionCard } from "@/components/dashboard/ui";
import { motion, AnimatePresence } from "framer-motion";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";
import { cn } from "@/lib/utils";

export default function AdminOverviewPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const supabase = createBrowserSupabaseClient();

    const fetchStats = async () => {
        try {
            const res = await apiFetch("/api/admin/stats");
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchActivity = async () => {
        const { data } = await supabase
            .from('audit_logs')
            .select(`*, user:users(email, role)`)
            .order('created_at', { ascending: false })
            .limit(5);
        if (data) setRecentActivity(data);
    };

    useEffect(() => {
        fetchStats();
        fetchActivity();

        // Real-time listener for audit logs
        const channel = supabase
            .channel('admin-activity')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'audit_logs' },
                () => {
                    fetchActivity();
                    fetchStats(); // Refresh stats on new actions
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aggregating Intelligence...</p>
            </div>
        </div>
    );

    const statsConfig = [
        { label: "Total Users", value: stats?.totalUsers || 0, icon: Users, iconBg: "bg-blue-600/10", iconColor: "text-blue-600" },
        { label: "Job Seekers", value: stats?.totalSeekers || 0, icon: UserCheck, iconBg: "bg-green-600/10", iconColor: "text-green-600" },
        { label: "Employers", value: stats?.totalEmployers || 0, icon: Briefcase, iconBg: "bg-purple-600/10", iconColor: "text-purple-600" },
        { label: "Active Jobs", value: stats?.totalJobs || 0, icon: TrendingUp, iconBg: "bg-amber-600/10", iconColor: "text-amber-600" },
        { label: "Applications", value: stats?.totalApplications || 0, icon: BarChart3, iconBg: "bg-rose-600/10", iconColor: "text-rose-600" },
    ];

    return (
        <div className="space-y-10 pb-20">
            <PageHeader
                title="Admin Overview"
                subtitle="Platform-wide metrics and system health synchronization."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {statsConfig.map((s, idx) => (
                    <motion.div
                        key={s.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                    >
                        <StatCard {...s} />
                    </motion.div>
                ))}
            </div>

            <SectionCard title="Recent Platform Activity">
                <div className="space-y-4">
                    {recentActivity.length === 0 ? (
                        <div className="py-24 flex flex-col items-center gap-4 text-center px-6 bg-white/50 backdrop-blur-sm rounded-[3rem] border border-dashed border-slate-200">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center shadow-inner">
                                <Activity size={40} className="text-slate-200" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-900 uppercase tracking-widest leading-loose">No live activity detected</p>
                                <p className="text-xs text-slate-400 font-medium">Platform events and audit logs will materialize here as they occur.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            <AnimatePresence mode="popLayout">
                                {recentActivity.map((log, idx) => (
                                    <motion.div
                                        key={log.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] flex items-center justify-between group hover:shadow-xl hover:shadow-blue-500/5 transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-blue-600">
                                                <Zap size={20} className={idx === 0 ? "animate-pulse" : ""} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{log.action}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                    {log.user?.email || 'Anonymous'} · {new Date(log.created_at).toLocaleTimeString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] group-hover:text-blue-400 transition-colors">
                                                {log.method} {log.path}
                                            </span>
                                            <div className={cn(
                                                "w-2 h-2 rounded-full",
                                                log.status_code >= 400 ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                                            )} />
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </SectionCard>
        </div>
    );
}

