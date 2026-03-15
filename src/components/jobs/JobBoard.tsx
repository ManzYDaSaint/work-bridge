"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Job } from "@/types";
import { Search, MapPin, Briefcase, ChevronRight, CheckCircle, Sparkles, Cog, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: { duration: 0.4 }
    }
};

export default function JobBoard() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState<string>("all");

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const res = await apiFetch("/jobs");
                const data: Job[] = await res.json();
                setJobs(data);
            } catch {
                // silent
            } finally {
                setLoading(false);
            }
        };
        fetchJobs();
    }, []);

    const handleApply = async (jobId: string) => {
        try {
            const res = await apiFetch(`/jobs/${jobId}/apply`, { method: "POST" });
            if (res.ok) {
                setAppliedJobs((prev) => new Set([...prev, jobId]));
            } else {
                const err = await res.json();
                alert(err.error || "Failed to apply");
            }
        } catch {
            alert("An error occurred while applying.");
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

    const featuredJobs = jobs.filter(j => j.isNew).slice(0, 3);

    return (
        <div className="space-y-16">
            {/* Featured Section */}
            {featuredJobs.length > 0 && !search && filterType === "all" && (
                <section className="space-y-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                                <Sparkles className="text-amber-500" size={32} />
                                Featured Opportunities
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Handpicked roles from top-tier companies</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {featuredJobs.map((job) => (
                            <motion.div
                                key={`featured-${job.id}`}
                                whileHover={{ y: -8, scale: 1.02 }}
                                className="glass-effect p-8 rounded-[2.5rem] relative overflow-hidden group transition-all duration-500 hover:shadow-blue-500/20"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl -z-10 group-hover:bg-blue-500/20 transition-colors" />
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg text-blue-600 font-black text-xl border border-slate-100 dark:border-slate-700">
                                        {job.employer.companyName[0]}
                                    </div>
                                    <span className="px-3 py-1 bg-blue-500/10 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-500/20">
                                        Featured
                                    </span>
                                </div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 leading-tight group-hover:text-blue-600 transition-colors">
                                    {job.title}
                                </h3>
                                <p className="font-bold text-slate-500 dark:text-slate-400 mb-6">{job.employer.companyName}</p>
                                <div className="flex items-center gap-4 text-sm font-bold text-slate-400 mb-8">
                                    <span className="flex items-center gap-1.5">
                                        <MapPin size={14} className="text-blue-500" />
                                        {job.location}
                                    </span>
                                    <span className="flex items-center gap-1.5 capitalize">
                                        <Briefcase size={14} className="text-indigo-500" />
                                        {job.type}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleApply(job.id)}
                                    className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black transition-all hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white active:scale-95 shadow-xl shadow-slate-900/10 dark:shadow-white/5"
                                >
                                    Quick Apply
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

            {/* Advanced Search & Filtering */}
            <div className="flex flex-col lg:flex-row gap-6 items-center">
                <div className="relative group flex-1 w-full">
                    <div className="absolute inset-0 bg-blue-600/5 blur-2xl rounded-[2rem] -z-10 group-focus-within:bg-blue-600/10 transition-colors" />
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

            {/* Job List */}
            <div className="space-y-8">
                {loading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white dark:bg-slate-900/50 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 animate-pulse h-[300px]" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-32 glass-effect rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800"
                    >
                        <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-400">
                            <Briefcase size={48} />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-slate-200 mb-3 tracking-tight">No opportunities found</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto font-medium text-lg leading-relaxed">
                            {search || filterType !== "all"
                                ? "We couldn't find anything matching your current filters. Try broadening your search or switching categories."
                                : "The board is currently clear. Check back later for new professional broadcasts."}
                        </p>
                    </motion.div>
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
                                    whileHover={{ y: -4 }}
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
                                            {appliedJobs.has(job.id) ? (
                                                <motion.div
                                                    key="applied"
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="flex-1 flex items-center justify-center gap-2 text-green-600 dark:text-green-400 font-black px-6 py-5 bg-green-500/10 rounded-2xl border border-green-500/20 shadow-inner"
                                                >
                                                    <CheckCircle size={20} strokeWidth={3} />
                                                    Success! Application Received
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="unapplied"
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    className="flex-1 flex items-center gap-4"
                                                >
                                                    <motion.button
                                                        whileTap={{ scale: 0.96 }}
                                                        onClick={() => handleApply(job.id)}
                                                        className="flex-1 bg-blue-600 text-white px-8 py-5 rounded-2xl font-black shadow-2xl shadow-blue-500/30 hover:bg-blue-500 transition-all flex items-center justify-center gap-3 group active:scale-95"
                                                    >
                                                        Apply with One-Click
                                                        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                                    </motion.button>
                                                    <button className="w-16 h-16 rounded-2xl border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-500/50 transition-all active:scale-90 group">
                                                        <Cog size={22} className="group-hover:rotate-45 transition-transform" />
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
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
