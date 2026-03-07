"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { PageHeader, Badge } from "@/components/dashboard/ui";
import { Briefcase, CheckCircle, XCircle, Trash2, Search, Loader2, MapPin, Clock, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function AdminJobsPage() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [actioning, setActioning] = useState<string | null>(null);

    const fetchJobs = async () => {
        try {
            const res = await apiFetch("/api/admin/jobs");
            if (res.ok) setJobs(await res.json());
        } catch (error) {
            toast.error("Market Link Failed: Unable to synchronize job postings.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchJobs(); }, []);

    const handleStatusUpdate = async (jobId: string, status: string, title: string) => {
        setActioning(jobId);
        try {
            const res = await apiFetch("/api/admin/jobs", {
                method: "PATCH",
                body: JSON.stringify({ jobId, status }),
                headers: { "Content-Type": "application/json" }
            });
            if (res.ok) {
                setJobs(jobs.map(j => j.id === jobId ? { ...j, status } : j));
                toast.success(`Market Update: "${title}" is now ${status.toLowerCase()}.`);
            } else {
                toast.error("Protocol Error: Status transition was denied.");
            }
        } catch (error) {
            toast.error("System Failure: Could not update market status.");
        } finally {
            setActioning(null);
        }
    };

    const handleDelete = async (jobId: string, title: string) => {
        if (!confirm(`Are you sure you want to completely remove "${title}"? This cannot be undone.`)) return;

        setActioning(jobId);
        try {
            const res = await apiFetch(`/api/admin/jobs?jobId=${jobId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setJobs(jobs.filter(j => j.id !== jobId));
                toast.success(`Market Update: "${title}" has been permanently purged.`);
            } else {
                toast.error("Protocol Error: Deletion failed.");
            }
        } catch (error) {
            toast.error("System Failure: Could not delete market listing.");
        } finally {
            setActioning(null);
        }
    };

    const filteredJobs = jobs.filter(j =>
        j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Scanning Opportunities...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 pb-20">
            <PageHeader
                title="Market Oversight"
                subtitle="Review and moderate all active opportunities in the WorkBridge ecosystem."
            />

            {/* Controls */}
            <div className="relative max-w-xl w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Search by job title or company entity..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-14 pl-12 pr-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold shadow-sm"
                />
            </div>

            {/* Jobs List */}
            <div className="space-y-6">
                <AnimatePresence mode="popLayout">
                    {filteredJobs.map((job, idx) => (
                        <motion.div
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: idx * 0.05 }}
                            key={job.id}
                            className="bg-white rounded-[2.5rem] border border-slate-200 p-8 hover:border-blue-500/30 hover:shadow-2xl hover:shadow-slate-200/50 transition-all group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl -z-10 group-hover:bg-blue-600/10 transition-colors" />

                            <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center">
                                <div className="w-20 h-20 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-xl group-hover:shadow-blue-500/20 transition-all duration-500 shadow-inner shrink-0">
                                    <Briefcase size={36} />
                                </div>

                                <div className="flex-1 min-w-0 space-y-3">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h3 className="text-2xl font-black text-slate-900 truncate tracking-tight">{job.title}</h3>
                                        <Badge
                                            label={job.status}
                                            variant={
                                                job.status === 'APPROVED' ? 'green' :
                                                    job.status === 'REJECTED' ? 'red' :
                                                        job.status === 'FLAGGED' ? 'yellow' : 'slate'
                                            }
                                        />
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-500">
                                        <div className="flex items-center gap-2 group-hover:text-slate-900 transition-colors">
                                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{job.companyName}</span>
                                        </div>
                                        <span className="flex items-center gap-1.5 text-xs font-bold"><MapPin size={12} className="text-orange-500" /> {job.location}</span>
                                        <span className="flex items-center gap-1.5 text-xs font-bold"><Clock size={12} className="text-green-500" /> {new Date(job.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                                    </div>
                                </div>

                                <div className="flex gap-3 w-full lg:w-auto">
                                    {job.status !== 'APPROVED' && (
                                        <button
                                            onClick={() => handleStatusUpdate(job.id, 'APPROVED', job.title)}
                                            disabled={actioning === job.id}
                                            className="flex-1 lg:flex-none h-12 px-8 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            {actioning === job.id ? <Loader2 size={14} className="animate-spin" /> : <>Approve <CheckCircle size={14} /></>}
                                        </button>
                                    )}
                                    {job.status !== 'REJECTED' && (
                                        <button
                                            onClick={() => handleStatusUpdate(job.id, 'REJECTED', job.title)}
                                            disabled={actioning === job.id}
                                            className="flex-1 lg:flex-none h-12 px-8 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            Reject <XCircle size={14} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(job.id, job.title)}
                                        disabled={actioning === job.id}
                                        className="h-12 w-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all border border-transparent hover:border-rose-100 active:scale-95 shrink-0"
                                        title="Purge Listing"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {filteredJobs.length === 0 && (
                <div className="py-32 text-center bg-white/50 rounded-[4rem] border border-dashed border-slate-200 backdrop-blur-sm">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <Briefcase size={48} className="text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">No Opportunities</p>
                    <p className="text-base text-slate-900 font-bold mt-2">No matching jobs found in the marketplace cache.</p>
                </div>
            )}
        </div>
    );
}

