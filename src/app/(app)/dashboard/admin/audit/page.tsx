"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { AuditLog, AuditLogResponse } from "@/types";
import { History, Search, Download, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/dashboard/ui";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminAuditPage() {
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [meta, setMeta] = useState({ total: 0, limit: 50, offset: 0 });
    const [filters, setFilters] = useState({
        userId: "",
        action: "",
        path: ""
    });

    const fetchAuditLogs = async () => {
        setLoading(true);
        try {
            const searchParams = new URLSearchParams({
                limit: String(meta.limit),
                offset: String(meta.offset)
            });
            Object.entries(filters).forEach(([k, v]) => v && searchParams.set(k, v));

            const res = await apiFetch(`/api/admin/audit-logs?${searchParams.toString()}`);
            if (res.ok) {
                const payload: AuditLogResponse = await res.json();
                setAuditLogs(payload.items ?? []);
                setMeta((m) => ({ ...m, total: payload.total ?? 0 }));
            }
        } catch (error) {
            console.error("Failed to fetch audit logs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAuditLogs();
    }, [meta.offset, JSON.stringify(filters)]);

    const handleExport = async () => {
        try {
            const res = await apiFetch("/api/admin/audit-logs/export?limit=1000");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            console.error("Export failed:", error);
        }
    };

    return (
        <div className="space-y-8 pb-20">
            <PageHeader
                title="Audit Registry"
                subtitle="Complete log of all system and user events for platform integrity."
            />

            {/* Controls */}
            <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-white/50 backdrop-blur-sm p-4 rounded-[2rem] border border-slate-200 shadow-sm">
                <div className="flex flex-wrap gap-3 w-full xl:w-auto">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            placeholder="Filter User ID..."
                            value={filters.userId}
                            onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                            className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium shadow-sm"
                        />
                    </div>
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            placeholder="Filter Action..."
                            value={filters.action}
                            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                            className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium shadow-sm"
                        />
                    </div>
                </div>

                <button
                    onClick={handleExport}
                    className="h-11 px-8 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg flex items-center gap-2"
                >
                    <Download size={14} />
                    Export Registry (CSV)
                </button>
            </div>

            {/* Log List */}
            <div className="glass-effect rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actor Entity</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Operation</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">API Endpoint</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <AnimatePresence mode="wait">
                                {loading ? (
                                    <motion.tr
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <td colSpan={5} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Refreshing Registry...</p>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ) : auditLogs.length === 0 ? (
                                    <motion.tr
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <td colSpan={5} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3 opacity-40">
                                                <History size={40} className="text-slate-300" />
                                                <p className="text-sm font-bold text-slate-900">No events found in registry</p>
                                                <p className="text-xs text-slate-400">Try adjusting your filters to find specific operations.</p>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ) : (
                                    auditLogs.map((log) => (
                                        <motion.tr
                                            key={log.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="hover:bg-slate-50 transition-colors group"
                                        >
                                            <td className="px-8 py-5 whitespace-nowrap">
                                                <div className="text-xs font-bold text-slate-500">
                                                    {new Date(log.createdAt).toLocaleString(undefined, {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-900 leading-none mb-1 group-hover:text-blue-600 transition-colors">{log.user?.email ?? "ANONYMOUS"}</span>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{log.user?.role ?? "GUEST"}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{log.action}</span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-[11px] font-bold text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded-md border border-slate-100">{log.path}</span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${log.statusCode >= 400
                                                        ? "bg-red-50 text-red-600 border-red-100"
                                                        : "bg-green-50 text-green-600 border-green-100"
                                                    }`}>
                                                    {log.statusCode}
                                                </span>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row justify-between items-center px-10 py-6 bg-slate-50 border-t border-slate-100 gap-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Registry Total: {meta.total}</span>
                    <div className="flex gap-2">
                        <button
                            disabled={meta.offset === 0 || loading}
                            onClick={() => setMeta((m) => ({ ...m, offset: Math.max(m.offset - m.limit, 0) }))}
                            className="h-10 px-4 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 active:scale-95 transition-all flex items-center gap-2 hover:border-slate-400"
                        >
                            <ChevronLeft size={14} /> Earlier
                        </button>
                        <button
                            disabled={meta.offset + meta.limit >= meta.total || loading}
                            onClick={() => setMeta((m) => ({ ...m, offset: m.offset + m.limit }))}
                            className="h-10 px-4 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 active:scale-95 transition-all flex items-center gap-2 hover:border-slate-400"
                        >
                            Later <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

