"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Job } from "@/types";
import { Plus, Users, MapPin, Clock, ChevronRight, Briefcase, Sparkles } from "lucide-react";
import CreateJobModal from "./CreateJobModal";
import ApplicantManagementModal from "./ApplicantManagementModal";
import { motion, AnimatePresence } from "framer-motion";

export default function EmployerWorkspace() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchMyJobs = async () => {
        try {
            const res = await apiFetch("/api/jobs/my-jobs");
            const data: Job[] = await res.json();
            setJobs(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMyJobs(); }, []);

    const totalApplicants = jobs.reduce((acc, job) => acc + (job._count?.applications ?? 0), 0);
    const activeJobs = jobs.length;

    return (
        <div className="space-y-16">
            {/* Stats Overview */}
            {!loading && jobs.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="glass-effect p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600">
                                <Briefcase size={28} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Broadcasting</span>
                        </div>
                        <h4 className="text-4xl font-black text-slate-900 dark:text-white mb-1">{activeJobs}</h4>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Active Postings</p>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -5 }}
                        className="glass-effect p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-14 h-14 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-600">
                                <Users size={28} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pipeline</span>
                        </div>
                        <h4 className="text-4xl font-black text-slate-900 dark:text-white mb-1">{totalApplicants}</h4>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total Candidates</p>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -5 }}
                        className="glass-effect p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white">
                                <Sparkles size={28} />
                            </div>
                            <button
                                onClick={() => setShowModal(true)}
                                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all active:scale-90"
                            >
                                <Plus size={20} strokeWidth={3} />
                            </button>
                        </div>
                        <h4 className="text-3xl font-black mb-1 leading-tight">Grow Your Team</h4>
                        <p className="text-sm font-bold opacity-80 uppercase tracking-widest">New Broadcast</p>
                    </motion.div>
                </div>
            )}

            {/* Premium Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-900/50 p-10 md:p-14 rounded-[3rem] border border-slate-200 dark:border-slate-800/50 shadow-sm relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] -z-10" />
                <div className="max-w-2xl text-center md:text-left">
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-4">Command Center</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-lg font-medium leading-relaxed">
                        Precision engineering for your professional landscape. Analyze, manage, and scale your organizational pulse.
                    </p>
                </div>
                {jobs.length === 0 && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="mt-8 md:mt-0 bg-blue-600 text-white px-12 py-5 rounded-2xl flex items-center gap-4 hover:bg-blue-500 transition-all font-black shadow-2xl shadow-blue-500/30 active:scale-95 flex-shrink-0 group"
                    >
                        <Plus size={24} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
                        Initiate Broadcast
                    </button>
                )}
            </motion.div>

            {/* Job List Container */}
            <div className="grid grid-cols-1 gap-8">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-64 bg-slate-100 dark:bg-slate-900/50 animate-pulse rounded-[3rem] border border-slate-100 dark:border-slate-800" />
                        ))}
                    </div>
                ) : jobs.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-32 glass-effect rounded-[3.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800"
                    >
                        <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 text-slate-300 dark:text-slate-700 shadow-inner">
                            <Users size={64} />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-slate-200 mb-4 tracking-tight">System Idle</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-12 font-medium text-lg leading-relaxed">
                            Ready to attract elite talent? Broadcast your professional opening to our verified network.
                        </p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-10 py-4 rounded-2xl font-black hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white transition-all active:scale-95 shadow-xl uppercase tracking-widest text-sm"
                        >
                            Launch Post
                        </button>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20">
                        {jobs.map((job, i) => (
                            <motion.div
                                key={job.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                whileHover={{ y: -8 }}
                                onClick={() => setSelectedJob(job)}
                                className="group glass-effect p-10 rounded-[3rem] shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-500/40 transition-all duration-500 cursor-pointer flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-8">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors tracking-tight leading-tight">
                                                    {job.title}
                                                </h3>
                                                <div className="px-2.5 py-1 bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1 border border-green-500/20">
                                                    Live
                                                </div>
                                            </div>
                                            <div className="flex items-center text-sm font-bold text-slate-500 dark:text-slate-400 space-x-6">
                                                <span className="flex items-center gap-1.5 ">
                                                    <MapPin size={16} className="text-blue-500" />
                                                    {job.location}
                                                </span>
                                                <span className="flex items-center gap-1.5 capitalize">
                                                    <Clock size={16} className="text-indigo-500" />
                                                    {job.type}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center font-black text-2xl text-slate-400 border border-slate-100 dark:border-slate-700/50">
                                            {job.title[0]}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700/50 group-hover:bg-blue-600 group-hover:border-blue-500 transition-all duration-500 shadow-inner">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center text-blue-600 group-hover:text-blue-500 group-hover:scale-110 transition-all shadow-sm">
                                            <Users size={28} />
                                        </div>
                                        <div>
                                            <div className="text-3xl font-black text-slate-900 dark:text-white group-hover:text-white leading-none mb-1">
                                                {job._count?.applications ?? 0}
                                            </div>
                                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-blue-100 whitespace-nowrap">
                                                Active Candidates
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight size={32} className="text-slate-300 group-hover:text-white group-hover:translate-x-2 transition-all opacity-50" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <CreateJobModal
                    onClose={() => setShowModal(false)}
                    onCreated={fetchMyJobs}
                />
            )}

            {selectedJob && (
                <ApplicantManagementModal
                    job={selectedJob}
                    onClose={() => setSelectedJob(null)}
                />
            )}
        </div>
    );
}
