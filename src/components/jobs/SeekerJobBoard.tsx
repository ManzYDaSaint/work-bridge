"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Job } from "@/types";
import { Search, MapPin, Briefcase, ChevronRight, CheckCircle, Sparkles, Bookmark, BookmarkCheck, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: { duration: 0.4 }
    }
};

export default function SeekerJobBoard() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
    const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState<string>("all");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [jobsRes, savedRes, appsRes] = await Promise.all([
                    apiFetch("/api/jobs"),
                    apiFetch("/api/seeker/saved-jobs"),
                    apiFetch("/api/applications")
                ]);

                if (jobsRes.ok) setJobs(await jobsRes.json());
                if (savedRes.ok) {
                    const saved = await savedRes.json();
                    setSavedJobIds(new Set(saved.map((s: any) => s.job_id)));
                }
                if (appsRes.ok) {
                    const apps = await appsRes.json();
                    setAppliedJobIds(new Set(apps.map((a: any) => a.job_id)));
                }
            } catch (error) {
                console.error("Fetch error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleApply = async (jobId: string) => {
        try {
            const res = await apiFetch(`/api/jobs/${jobId}/apply`, { method: "POST" });
            if (res.ok) {
                setAppliedJobIds((prev) => new Set([...prev, jobId]));
                toast.success("Application sent successfully!");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to apply");
            }
        } catch {
            toast.error("An error occurred while applying.");
        }
    };

    const handleToggleSave = async (jobId: string) => {
        try {
            const res = await apiFetch("/api/seeker/saved-jobs", {
                method: "POST",
                body: JSON.stringify({ jobId })
            });

            if (res.ok) {
                const data = await res.json();
                setSavedJobIds((prev) => {
                    const next = new Set(prev);
                    if (data.saved) {
                        next.add(jobId);
                        toast.success("Job saved to your bookmarks");
                    } else {
                        next.delete(jobId);
                        toast.info("Job removed from bookmarks");
                    }
                    return next;
                });
            }
        } catch {
            toast.error("Failed to update saved jobs.");
        }
    };

    const filtered = jobs.filter(
        (j) =>
            (j.title.toLowerCase().includes(search.toLowerCase()) ||
                j.employer.companyName.toLowerCase().includes(search.toLowerCase()) ||
                j.location.toLowerCase().includes(search.toLowerCase()) ||
                j.skills.some((s) => s.toLowerCase().includes(search.toLowerCase()))) &&
            (filterType === "all" || j.type.toLowerCase() === filterType.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col lg:flex-row gap-6 items-center">
                <div className="relative group flex-1 w-full">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={22} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search roles, companies, or tech stack..."
                        className="w-full pl-16 pr-6 py-5 bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none text-slate-700 dark:text-slate-200 text-lg font-medium transition-all"
                    />
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-3xl border border-slate-200 dark:border-slate-700/50 shrink-0 overflow-x-auto max-w-full">
                    {["all", "full-time", "part-time", "contract", "remote"].map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={cn(
                                "px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                                filterType === type
                                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-md shadow-blue-500/5"
                                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                            )}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-8">
                {loading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white dark:bg-slate-900/50 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 animate-pulse h-[300px]" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-24 bg-white dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <Briefcase size={48} className="mx-auto mb-6 text-slate-300" />
                        <h3 className="text-2xl font-black text-slate-900 dark:text-slate-200 mb-2">No opportunities found</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto font-medium">
                            Try adjusting your filters or search terms.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <AnimatePresence mode="popLayout">
                            {filtered.map((job) => (
                                <motion.div
                                    key={job.id}
                                    layout
                                    variants={itemVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="group glass-effect p-10 rounded-[3rem] shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-500/40 transition-all duration-500 flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex justify-between items-start mb-8">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors tracking-tight leading-tight">
                                                        {job.title}
                                                    </h3>
                                                    {job.isNew && (
                                                        <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1 border border-amber-500/20">
                                                            <Sparkles size={10} />
                                                            Hot
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-lg font-bold text-slate-500 dark:text-slate-400">
                                                    {job.employer.companyName}
                                                </p>
                                            </div>
                                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center font-black text-2xl text-slate-400 border border-slate-100 dark:border-slate-700/50">
                                                {job.employer.companyName[0]}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-6 text-sm font-bold text-slate-500 dark:text-slate-400 mb-8">
                                            <span className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800/50 rounded-xl">
                                                <MapPin size={16} className="text-blue-500" />
                                                {job.location}
                                            </span>
                                            <span className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800/50 rounded-xl capitalize">
                                                <Briefcase size={16} className="text-indigo-500" />
                                                {job.type}
                                            </span>
                                            {job.salary_range && (
                                                <span className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800/50 rounded-xl">
                                                    <DollarSign size={16} className="text-green-500" />
                                                    {job.salary_range}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-2 mb-10">
                                            {job.skills.map((skill, i) => (
                                                <span key={i} className="px-4 py-1.5 bg-blue-500/5 dark:bg-blue-400/5 text-blue-600 dark:text-blue-400 rounded-xl text-[11px] font-black uppercase tracking-wider border border-blue-500/10 dark:border-blue-400/10">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <AnimatePresence mode="wait">
                                            {appliedJobIds.has(job.id) ? (
                                                <motion.div
                                                    key="applied"
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="flex-1 flex items-center justify-center gap-2 text-green-600 dark:text-green-400 font-black px-6 py-5 bg-green-500/10 rounded-2xl border border-green-500/20"
                                                >
                                                    <CheckCircle size={20} />
                                                    Applied
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="unapplied"
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    className="flex-1 flex items-center"
                                                >
                                                    <button
                                                        onClick={() => handleApply(job.id)}
                                                        className="flex-1 bg-blue-600 text-white px-8 py-5 rounded-2xl font-black shadow-lg hover:bg-blue-500 transition-all flex items-center justify-center gap-3 group active:scale-95"
                                                    >
                                                        Apply Now
                                                        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                        <button
                                            onClick={() => handleToggleSave(job.id)}
                                            className={cn(
                                                "w-16 h-16 rounded-2xl border-2 flex items-center justify-center transition-all active:scale-90",
                                                savedJobIds.has(job.id)
                                                    ? "bg-yellow-500/10 border-yellow-500/50 text-yellow-600 shadow-inner"
                                                    : "border-slate-200 dark:border-slate-800 text-slate-400 hover:text-yellow-500 hover:border-yellow-500/50"
                                            )}
                                        >
                                            {savedJobIds.has(job.id) ? (
                                                <BookmarkCheck size={24} fill="currentColor" />
                                            ) : (
                                                <Bookmark size={24} />
                                            )}
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
