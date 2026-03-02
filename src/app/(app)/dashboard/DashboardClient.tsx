"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { User } from "@/types";
import { LogOut, Settings, ShieldAlert, LayoutDashboard, UserCircle, Bell, ExternalLink } from "lucide-react";
import JobBoard from "@/components/jobs/JobBoard";
import EmployerWorkspace from "@/components/jobs/EmployerWorkspace";
import SeekerProfile from "@/components/profile/SeekerProfile";
import EmployerProfile from "@/components/profile/EmployerProfile";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";
import MobileNav from "@/components/layout/MobileNav";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type Tab = "jobs" | "profile" | "notifications";

export default function DashboardClient() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>("jobs");
    const [unreadCount, setUnreadCount] = useState(0);
    const router = useRouter();
    const supabase = createBrowserSupabaseClient();

    useEffect(() => {
        const init = async () => {
            try {
                const res = await apiFetch("/me");
                if (res.ok) {
                    const data: User = await res.json();
                    setUser(data);
                    if (data.role === "ADMIN") {
                        router.push("/dashboard/admin");
                    }
                }
            } catch {
                // session present but API unavailable
            } finally {
                setLoading(false);
            }
        };
        init();

        const fetchUnread = async () => {
            try {
                const res = await apiFetch("/notifications");
                const data = await res.json();
                setUnreadCount(data.filter((n: { isRead: boolean }) => !n.isRead).length);
            } catch { /* silent */ }
        };
        fetchUnread();

        // Supabase Realtime for instant notification updates
        const channel = supabase
            .channel('notification-updates')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user?.id}`
                },
                () => {
                    fetchUnread();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [router, user?.id]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#020617]">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full shadow-lg shadow-blue-500/20"
                />
            </div>
        );
    }

    const isPendingEmployer = user?.role === "EMPLOYER" && user?.employer?.status === "PENDING";

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#020617] transition-colors duration-500 pb-20 md:pb-0">
            {/* Dashboard Navigation */}
            <nav className="sticky top-0 z-40 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border-b border-white/20 dark:border-slate-800/50 shadow-sm transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <div className="flex items-center gap-3">
                            <motion.div
                                whileHover={{ scale: 1.05, rotate: 5 }}
                                className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-xl shadow-blue-500/20"
                            >
                                W
                            </motion.div>
                            <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white hidden sm:block">
                                WorkBridge
                            </span>
                        </div>

                        {/* Middle Nav for Job Seekers & Employers */}
                        {(user?.role === "JOB_SEEKER" || user?.role === "EMPLOYER") && (
                            <div className="hidden lg:flex items-center bg-slate-100/50 dark:bg-slate-800/40 p-1.5 rounded-2xl border border-white/20 dark:border-slate-700/30 backdrop-blur-xl">
                                <button
                                    onClick={() => setActiveTab("jobs")}
                                    className={cn(
                                        "flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
                                        activeTab === "jobs"
                                            ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xl"
                                            : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                                    )}
                                >
                                    <LayoutDashboard size={14} />
                                    {user.role === "EMPLOYER" ? "Workspace" : "Job Board"}
                                </button>
                                <button
                                    onClick={() => setActiveTab("profile")}
                                    className={cn(
                                        "flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
                                        activeTab === "profile"
                                            ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xl"
                                            : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                                    )}
                                >
                                    <UserCircle size={14} />
                                    {user.role === "EMPLOYER" ? "Organization" : "My Profile"}
                                </button>
                            </div>
                        )}

                        <div className="flex items-center gap-3 md:gap-6">
                            <div className="hidden md:flex items-center gap-3">
                                <NotificationDropdown />
                                <div className="h-6 w-px bg-slate-200/50 dark:bg-slate-800/50"></div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-end">
                                    <span className="text-sm font-black text-slate-900 dark:text-white truncate max-w-[150px]">
                                        {user?.role === "JOB_SEEKER" ? user.jobSeeker?.fullName : user?.employer?.companyName}
                                    </span>
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                                        {user?.role.replace("_", " ")}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-3 bg-white/50 dark:bg-slate-800/50 border border-white/20 dark:border-slate-700/50 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-600 rounded-xl transition-all group shadow-sm active:scale-95"
                                title="Logout"
                            >
                                <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav >

            {/* Content Body */}
            < main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8" >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab + (user?.role || "")}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Status Messages */}
                        {isPendingEmployer && (
                            <div className="mb-12 p-8 rounded-3xl bg-amber-500/10 border-2 border-amber-500/20 flex flex-col md:flex-row items-center gap-6 text-amber-900 dark:text-amber-400 shadow-xl shadow-amber-900/5">
                                <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500 flex-shrink-0">
                                    <ShieldAlert size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black mb-1">Company Verification Underway</h3>
                                    <p className="font-medium opacity-80 leading-relaxed">
                                        We&apos;re currently validating your recruitment credentials. You&apos;ll be able to broadcast new opportunities the moment our team gives the green light.
                                    </p>
                                </div>
                            </div>
                        )}

                        {user?.role === "EMPLOYER" ? (
                            <div className="space-y-12">
                                {activeTab === "jobs" && <EmployerWorkspace />}
                                {activeTab === "profile" && <EmployerProfile />}
                            </div>
                        ) : (
                            <div className="space-y-12">
                                {activeTab === "jobs" && (
                                    <>
                                        <JobBoard />

                                        {/* Modernized Promo Banner */}
                                        <motion.div
                                            whileHover={{ scale: 1.01 }}
                                            className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-blue-600 to-indigo-700 p-10 md:p-14 text-white shadow-2xl shadow-blue-500/20"
                                        >
                                            <div className="absolute top-0 right-0 w-[40%] h-full opacity-10 pointer-events-none">
                                                <Settings size={300} className="absolute -top-10 -right-20 animate-spin-slow" />
                                            </div>
                                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                                                <div className="text-center md:text-left">
                                                    <h3 className="text-3xl md:text-4xl font-black mb-4 tracking-tight leading-tight">
                                                        Don&apos;t miss your <br />
                                                        dream opportunity.
                                                    </h3>
                                                    <p className="text-blue-100 text-lg font-medium opacity-90 max-w-md">
                                                        Enable instant SMS and Email job alerts tailored perfectly to your professional profile.
                                                    </p>
                                                </div>
                                                <button className="h-16 px-10 bg-white text-blue-600 rounded-2xl font-black shadow-2xl hover:bg-slate-100 transition-all flex items-center gap-3 active:scale-95 group flex-shrink-0">
                                                    Setup Smart Alerts
                                                    <ExternalLink size={20} className="group-hover:translate-x-1 transition-transform" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    </>
                                )}

                                {activeTab === "notifications" && (
                                    <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-slate-200 dark:border-slate-800/50">
                                        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-10 tracking-tight">Recent Activity</h2>
                                        <NotificationDropdown isMobile />
                                    </div>
                                )}

                                {activeTab === "profile" && <SeekerProfile />}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </main >

            {/* Enhanced Mobile Navigation */}
            {
                user?.role === "JOB_SEEKER" && (
                    <MobileNav
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        unreadNotifications={unreadCount}
                        onLogout={handleLogout}
                    />
                )
            }
        </div >
    );
}
