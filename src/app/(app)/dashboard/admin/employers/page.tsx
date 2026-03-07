"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Employer } from "@/types";
import { ShieldCheck, CheckCircle, XCircle, Search, Loader2, Building2, MapPin, ExternalLink, Mail, Eye, Info, Link as LinkIcon, MessageSquare } from "lucide-react";
import { PageHeader, Badge } from "@/components/dashboard/ui";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function EmployerVerificationPage() {
    const [employers, setEmployers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
    const [actioning, setActioning] = useState<string | null>(null);
    const [selectedEmployer, setSelectedEmployer] = useState<any | null>(null);

    const fetchEmployers = async () => {
        try {
            const res = await apiFetch("/api/admin/employers");
            if (res.ok) setEmployers(await res.json());
        } catch (error) {
            toast.error("Cloud connection failed. Could not fetch entity list.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchEmployers(); }, []);

    const handleStatusUpdate = async (employerId: string, status: string, companyName: string) => {
        setActioning(employerId);
        try {
            const res = await apiFetch("/api/admin/employers", {
                method: "PATCH",
                body: JSON.stringify({
                    employerId,
                    status,
                    notes: `Manually updated to ${status} by Administrator.`
                }),
                headers: { "Content-Type": "application/json" }
            });
            if (res.ok) {
                setEmployers(employers.map(e => e.id === employerId ? { ...e, status: status as any } : e));
                toast.success(`${companyName} verification: ${status}.`, {
                    description: "Protocol update synchronized across marketplace."
                });
            } else {
                toast.error("Security Override: Transition blocked by core gateway.");
            }
        } catch (error) {
            toast.error("System Failure: Could not finalize verification.");
        } finally {
            setActioning(null);
        }
    };

    const pendingCount = employers.filter(e => e.status === 'PENDING').length;

    const filteredEmployers = employers.filter(e => {
        const matchesSearch = e.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (e.industry && e.industry.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verifying Authority...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 pb-40">
            <PageHeader
                title="Credential Validation"
                subtitle="Review and verify corporate entities requesting access to the talent pool."
            />

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="relative w-full max-w-xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by company or industry..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-14 pl-12 pr-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold shadow-sm"
                    />
                </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
                {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setStatusFilter(tab)}
                        className={`h-10 px-5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${statusFilter === tab
                                ? 'bg-slate-900 text-white shadow-lg'
                                : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400'
                            }`}
                    >
                        {tab}
                        {tab === 'PENDING' && pendingCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Employer Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                <AnimatePresence mode="popLayout">
                    {filteredEmployers.map((emp, idx) => (
                        <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ delay: idx * 0.05 }}
                            key={emp.id}
                            className="bg-white rounded-[3rem] border border-slate-200 p-10 hover:shadow-2xl hover:shadow-slate-200/50 transition-all group relative overflow-hidden flex flex-col justify-between min-h-[420px]"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl -z-10 group-hover:bg-blue-600/10 transition-colors" />

                            <div>
                                <div className="flex items-start justify-between mb-8">
                                    <div className="w-20 h-20 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 group-hover:shadow-xl group-hover:shadow-blue-500/20 transition-all duration-500 shadow-inner shrink-0">
                                        <Building2 size={40} />
                                    </div>
                                    <Badge
                                        label={emp.status}
                                        variant={
                                            emp.status === 'APPROVED' ? 'green' :
                                                emp.status === 'REJECTED' ? 'red' : 'yellow'
                                        }
                                    />
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-2xl font-black text-slate-900 leading-tight truncate tracking-tight">{emp.companyName}</h3>
                                            {emp.status === 'APPROVED' && <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white shrink-0"><CheckCircle size={12} /></div>}
                                        </div>
                                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">{emp.industry || "General Enterprise"}</p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-slate-500 hover:text-slate-900 transition-colors">
                                            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100"><MapPin size={14} className="text-orange-500" /></div>
                                            <span className="text-xs font-black tracking-tight">{emp.location || "System Registry"}</span>
                                        </div>
                                        {emp.website && (
                                            <a href={emp.website} target="_blank" className="flex items-center gap-3 text-blue-600 hover:underline">
                                                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100"><LinkIcon size={14} /></div>
                                                <span className="text-xs font-black tracking-tight truncate max-w-[150px]">{emp.website.replace(/^https?:\/\//, '')}</span>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-10 pt-8 border-t border-slate-100 flex gap-2">
                                <button
                                    onClick={() => setSelectedEmployer(emp)}
                                    className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:text-blue-600 hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100 active:scale-95 shrink-0"
                                    title="View Intelligence"
                                >
                                    <Info size={18} />
                                </button>

                                {emp.status === 'PENDING' ? (
                                    <div className="flex gap-2 flex-1">
                                        <button
                                            onClick={() => handleStatusUpdate(emp.id, 'APPROVED', emp.companyName)}
                                            disabled={actioning === emp.id}
                                            className="flex-1 h-12 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            {actioning === emp.id ? <Loader2 size={14} className="animate-spin" /> : <>Validate <CheckCircle size={14} /></>}
                                        </button>
                                        <button
                                            onClick={() => handleStatusUpdate(emp.id, 'REJECTED', emp.companyName)}
                                            disabled={actioning === emp.id}
                                            className="h-12 w-12 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all active:scale-95"
                                            title="Deny Access"
                                        >
                                            <XCircle size={18} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleStatusUpdate(emp.id, 'PENDING', emp.companyName)}
                                        disabled={actioning === emp.id}
                                        className="flex-1 h-12 bg-slate-100 text-slate-400 border border-slate-200 border-dashed rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        {actioning === emp.id ? <Loader2 size={14} className="animate-spin" /> : <>Revoke Status <ShieldCheck size={14} /></>}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Simple Detail Overlay (Instead of full modal for speed/UX) */}
            <AnimatePresence>
                {selectedEmployer && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl"
                        onClick={() => setSelectedEmployer(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-white rounded-[3rem] p-12 max-w-2xl w-full shadow-2xl relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-blue-50 to-transparent -z-10" />

                            <div className="flex items-start justify-between mb-8">
                                <div className="flex items-center gap-6">
                                    <div className="w-24 h-24 rounded-[2.5rem] bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-500/20"><Building2 size={48} /></div>
                                    <div>
                                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">{selectedEmployer.companyName}</h2>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Badge label={selectedEmployer.status} variant={selectedEmployer.status === 'APPROVED' ? 'green' : 'red'} />
                                            <span className="text-[10px] items-center flex gap-1 font-black text-slate-400 uppercase tracking-widest"><MessageSquare size={10} /> Intelligence Report</span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedEmployer(null)} className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200 transition-all"><XCircle size={24} className="text-slate-400" /></button>
                            </div>

                            <div className="space-y-8">
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Industry Vertical</p>
                                        <p className="text-sm font-black text-slate-900">{selectedEmployer.industry || "Not Categorized"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Global Presence</p>
                                        <p className="text-sm font-black text-slate-900">{selectedEmployer.location || "System Default"}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Organizational Mandate</p>
                                    <p className="text-sm font-medium text-slate-600 leading-relaxed bg-slate-50 p-6 rounded-3xl border border-slate-100">{selectedEmployer.description || "No mission statement or corporate description provided by this entity."}</p>
                                </div>

                                {selectedEmployer.website && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">External Link</p>
                                        <a href={selectedEmployer.website} target="_blank" className="flex items-center gap-2 text-sm font-black text-blue-600 hover:underline">
                                            {selectedEmployer.website} <ExternalLink size={14} />
                                        </a>
                                    </div>
                                )}
                            </div>

                            <div className="mt-12 flex gap-3">
                                <button
                                    onClick={() => {
                                        handleStatusUpdate(selectedEmployer.id, selectedEmployer.status === 'APPROVED' ? 'REJECTED' : 'APPROVED', selectedEmployer.companyName);
                                        setSelectedEmployer(null);
                                    }}
                                    className="flex-1 h-14 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl active:scale-95"
                                >
                                    {selectedEmployer.status === 'APPROVED' ? 'Revoke Access' : 'Authorize Entity'}
                                </button>
                                <button onClick={() => setSelectedEmployer(null)} className="h-14 px-8 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-slate-200 transition-all">Close</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {filteredEmployers.length === 0 && (
                <div className="py-32 text-center bg-white/50 rounded-[4rem] border border-dashed border-slate-200 backdrop-blur-sm">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <Building2 size={48} className="text-slate-200" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">No Enterprise Matches</p>
                    <p className="text-base text-slate-900 font-bold mt-2">Adjust your filters or verify direct identifiers.</p>
                </div>
            )}
        </div>
    );
}


