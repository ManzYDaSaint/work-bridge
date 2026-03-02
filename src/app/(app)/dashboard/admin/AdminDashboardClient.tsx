"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { AdminMetrics, AuditLog, AuditLogResponse, Employer, User } from "@/types";
import { CheckCircle, XCircle, Users, Briefcase, UserIcon, ShieldCheck, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import MFAEnrollment from "@/components/auth/mfa/MFAEnrollment";

type AdminTab = "metrics" | "employers" | "users" | "audit" | "security";

function MetricCard({ title, value, color, icon: Icon }: { title: string; value?: number; color: string; icon: any }) {
    return (
        <motion.div
            whileHover={{ y: -5, scale: 1.02 }}
            className="glass-effect p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-between"
        >
            <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl ${color} bg-opacity-10 flex items-center justify-center`}>
                    <Icon size={28} className={color.replace("bg-", "text-")} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">System Live</span>
            </div>
            <div>
                <p className="text-4xl font-black text-slate-900 dark:text-white mb-1 tracking-tighter">{value?.toLocaleString() ?? 0}</p>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{title}</p>
            </div>
        </motion.div>
    );
}

export default function AdminDashboardClient() {
    const [activeTab, setActiveTab] = useState<AdminTab>("metrics");
    const [employers, setEmployers] = useState<Employer[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [auditMeta, setAuditMeta] = useState({ total: 0, limit: 50, offset: 0 });
    const [auditFilters, setAuditFilters] = useState({ userId: "", action: "", method: "", path: "", minStatus: "", maxStatus: "" });
    const [fetchLoading, setFetchLoading] = useState(true);
    const [isAAL2, setIsAAL2] = useState(false);
    const router = useRouter();
    const supabase = createBrowserSupabaseClient();

    const fetchData = async () => {
        try {
            // Check AAL level
            const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
            setIsAAL2(aal?.currentLevel === 'aal2');

            const searchParams = new URLSearchParams({ limit: String(auditMeta.limit), offset: String(auditMeta.offset) });
            Object.entries(auditFilters).forEach(([k, v]) => v && searchParams.set(k, v));

            const [empRes, metRes, userRes, auditRes] = await Promise.all([
                apiFetch("/admin/employers"),
                apiFetch("/admin/stats"),
                apiFetch("/admin/users"),
                apiFetch(`/admin/audit-logs?${searchParams.toString()}`),
            ]);

            if (empRes.ok) setEmployers(await empRes.json());
            if (metRes.ok) {
                const data = await metRes.json();
                setMetrics(data.stats);
            }
            if (userRes.ok) setUsers(await userRes.json());

            if (auditRes.ok) {
                const auditPayload: AuditLogResponse = await auditRes.json();
                setAuditLogs(auditPayload.items ?? []);
                setAuditMeta((m) => ({ ...m, total: auditPayload.total ?? 0 }));
            }
        } catch (error) {
            console.error("Data fetch error:", error);
        } finally {
            setFetchLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab !== "security") {
            fetchData();
        } else {
            setFetchLoading(false);
        }

        // --- Live Pulse Polling (30s) ---
        const interval = setInterval(() => {
            if (activeTab === "metrics" || activeTab === "audit") {
                fetchData();
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [auditMeta.offset, JSON.stringify(auditFilters), activeTab]);

    const updateEmployerStatus = async (id: string, status: string) => {
        const res = await apiFetch(`/admin/employers/${id}/status`, {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        if (res.ok) setEmployers((prev) => prev.map((e) => (e.id === id ? { ...e, status: status as Employer["status"] } : e)));
    };

    const handleExport = async () => {
        const res = await apiFetch("/admin/audit-logs/export?limit=1000");
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "audit-logs.csv";
        document.body.appendChild(a); a.click(); a.remove();
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const statusBadge = (status: string) => {
        const colors: Record<string, string> = {
            PENDING: "bg-amber-500/10 text-amber-600 border-amber-500/20",
            APPROVED: "bg-green-500/10 text-green-600 border-green-500/20",
            REJECTED: "bg-red-500/10 text-red-600 border-red-500/20",
        };
        return <span className={`px-4 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border ${colors[status] ?? "bg-slate-100 text-slate-600"}`}>{status}</span>;
    };

    if (fetchLoading) return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-[#020617]">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"
            />
        </div>
    );

    const tabs: AdminTab[] = ["metrics", "employers", "users", "audit", "security"];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#020617] transition-colors duration-500">
            {/* Admin Navbar */}
            <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-xl shadow-blue-500/20">W</div>
                            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white hidden sm:block uppercase">WorkBridge <span className="text-blue-600">Admin</span></h1>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="hidden lg:flex items-center bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={cn(
                                            "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                            activeTab === tab
                                                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm"
                                                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                                        )}
                                    >
                                        {tab === "security" && <ShieldCheck size={14} />}
                                        {tab}
                                    </button>
                                ))}
                            </div>
                            <button onClick={handleLogout} className="text-sm font-black text-slate-500 hover:text-red-600 uppercase tracking-widest transition-colors flex items-center gap-2">
                                <XCircle size={18} />
                                Exit Portal
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto p-8 md:p-12 space-y-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-900/50 p-10 md:p-14 rounded-[3rem] border border-slate-200 dark:border-slate-800/50 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] -z-10" />
                    <div className="max-w-2xl text-center md:text-left">
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-4 capitalize">
                            Admin <span className="text-blue-600">{activeTab}</span>
                        </h2>
                        {activeTab === "audit" && (
                            <div className="flex items-center gap-2 mb-4 animate-in fade-in slide-in-from-left-4 duration-1000">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-[0.2em]">Live Registry Feed Active</span>
                            </div>
                        )}
                        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium leading-relaxed">
                            Global oversight of the WorkBridge ecosystem. Monitor metrics, validate credentials, and audit system integrity.
                        </p>
                    </div>
                    {activeTab !== "security" && (
                        <div className={cn(
                            "mt-8 md:mt-0 px-6 py-3 rounded-2xl flex items-center gap-3 border transition-all",
                            isAAL2
                                ? "bg-green-500/10 border-green-500/20 text-green-600"
                                : "bg-red-500/10 border-red-500/20 text-red-600 animate-pulse"
                        )}>
                            <ShieldCheck size={20} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                                {isAAL2 ? "MFA SECURED (AAL2)" : "MFA SETUP REQUIRED"}
                            </span>
                        </div>
                    )}
                </div>

                {/* MFA SECURITY TAB */}
                {activeTab === "security" && (
                    <div className="max-w-4xl mx-auto">
                        <MFAEnrollment />
                    </div>
                )}

                {/* METRICS */}
                {activeTab === "metrics" && metrics && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <MetricCard title="Total Users" value={metrics.totalUsers} color="bg-blue-600" icon={Users} />
                        <MetricCard title="Job Seekers" value={metrics.totalJobSeekers} color="bg-green-600" icon={UserIcon} />
                        <MetricCard title="Verified Employers" value={metrics.totalEmployers} color="bg-purple-600" icon={Briefcase} />
                        <MetricCard title="System Pulses" value={metrics.totalJobs} color="bg-amber-600" icon={CheckCircle} />
                    </div>
                )}

                {/* EMPLOYERS TABLE */}
                {activeTab === "employers" && (
                    <div className="glass-effect rounded-[3rem] shadow-sm border border-slate-200 dark:border-slate-800/50 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        {["Company Profile", "Industry Segment", "Security Status", "Action Center"].map((h) => (
                                            <th key={h} className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                    {employers.map((emp) => (
                                        <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-lg text-blue-600 border border-slate-100 dark:border-slate-700 shadow-sm">
                                                        {emp.companyName[0]}
                                                    </div>
                                                    <span className="font-black text-slate-900 dark:text-white text-lg">{emp.companyName}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-sm font-bold text-slate-500 dark:text-slate-400">{emp.industry ?? "General"}</td>
                                            <td className="px-8 py-6">{statusBadge(emp.status)}</td>
                                            <td className="px-8 py-6">
                                                <div className="flex gap-2">
                                                    {emp.status === "PENDING" && (
                                                        <>
                                                            <button
                                                                onClick={() => updateEmployerStatus(emp.id, "APPROVED")}
                                                                className="h-10 px-4 bg-green-500/10 text-green-600 rounded-xl hover:bg-green-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest active:scale-95"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => updateEmployerStatus(emp.id, "REJECTED")}
                                                                className="h-10 px-4 bg-red-500/10 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest active:scale-95"
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* USERS TABLE */}
                {activeTab === "users" && (
                    <div className="glass-effect rounded-[3rem] shadow-sm border border-slate-200 dark:border-slate-800/50 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        {["User Entity", "Permission Role", "Profile Label", "Registration Date"].map((h) => (
                                            <th key={h} className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                    {users.map((u) => (
                                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="font-black text-slate-900 dark:text-white text-lg">{u.email}</div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="px-3 py-1 bg-blue-600/10 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-blue-600/20">{u.role}</span>
                                            </td>
                                            <td className="px-8 py-6 text-sm font-bold text-slate-500 dark:text-slate-400">
                                                {u.role === "JOB_SEEKER" ? u.jobSeeker?.fullName : u.employer?.companyName ?? "System Entity"}
                                            </td>
                                            <td className="px-8 py-6 text-sm font-bold text-slate-400 dark:text-slate-500">
                                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* AUDIT LOGS */}
                {activeTab === "audit" && (
                    <div className="space-y-8">
                        {/* Audit Controls */}
                        <div className="glass-effect p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap gap-4 items-center">
                            <div className="flex-1 flex flex-wrap gap-3">
                                {["userId", "action", "path"].map((key) => (
                                    <input
                                        key={key}
                                        placeholder={`Filter ${key.replace("Id", "").toUpperCase()}`}
                                        value={(auditFilters as Record<string, string>)[key]}
                                        onChange={(e) => setAuditFilters({ ...auditFilters, [key]: e.target.value })}
                                        className="h-12 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl px-5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all min-w-[140px]"
                                    />
                                ))}
                            </div>
                            <button
                                onClick={handleExport}
                                className="h-12 px-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-xl"
                            >
                                Export Registry (CSV)
                            </button>
                        </div>

                        <div className="glass-effect rounded-[3rem] shadow-sm border border-slate-200 dark:border-slate-800/50 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        <tr>
                                            {["Timestamp", "Actor Entity", "Operation", "API Endpoint", "Status"].map((h) => (
                                                <th key={h} className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                        {auditLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-8 py-6 text-sm font-bold text-slate-400 dark:text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                                                <td className="px-8 py-6">
                                                    <div className="font-black text-slate-900 dark:text-white text-base leading-none mb-1">{log.user?.email ?? "ANONYMOUS"}</div>
                                                    <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{log.user?.role ?? "GUEST"}</div>
                                                </td>
                                                <td className="px-8 py-6 text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{log.action}</td>
                                                <td className="px-8 py-6 text-sm font-bold text-slate-500 dark:text-slate-400 font-mono">{log.path}</td>
                                                <td className="px-8 py-6">
                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${log.statusCode >= 400 ? "bg-red-500/10 text-red-600 border-red-500/20" : "bg-green-500/10 text-green-600 border-green-500/20"}`}>
                                                        {log.statusCode}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Pagination */}
                            <div className="flex justify-between items-center px-10 py-8 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Registry: {auditMeta.total}</span>
                                <div className="flex gap-4">
                                    <button
                                        disabled={auditMeta.offset === 0}
                                        onClick={() => setAuditMeta((m) => ({ ...m, offset: Math.max(m.offset - m.limit, 0) }))}
                                        className="h-10 px-6 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 active:scale-95 transition-all"
                                    >
                                        Earlier
                                    </button>
                                    <button
                                        disabled={auditMeta.offset + auditMeta.limit >= auditMeta.total}
                                        onClick={() => setAuditMeta((m) => ({ ...m, offset: m.offset + m.limit }))}
                                        className="h-10 px-6 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 active:scale-95 transition-all"
                                    >
                                        Later
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
