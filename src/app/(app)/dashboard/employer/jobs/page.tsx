"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Job } from "@/types";
import { Briefcase, PlusCircle, Calendar, Users, MapPin, Loader2, ChevronRight, Edit3, Sparkles } from "lucide-react";
import { PageHeader, EmptyState, Badge } from "@/components/dashboard/ui";
import Link from "next/link";
import { motion } from "framer-motion";

export default function EmployerJobsPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const res = await apiFetch("/api/jobs/my-jobs");
                if (res.ok) {
                    setJobs(await res.json());
                }
            } finally {
                setLoading(false);
            }
        };
        fetchJobs();
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
    );

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Operational Intelligence"
                subtitle="High-performance management of your active job postings"
                action={{ label: "Deploy New Role", icon: PlusCircle, href: "/dashboard/employer/jobs/new" }}
            />

            <div className="space-y-4">
                {jobs.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200">
                        <EmptyState
                            icon={Briefcase}
                            title="No Active Postings"
                            description="Strategic hiring begins with a single listing. Create your first operational requirement."
                            action={{ label: "Initialize Job Post", href: "/dashboard/employer/jobs/new" }}
                            iconColor="text-blue-500"
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {jobs.map((job, idx) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                key={job.id}
                                className="glass-effect p-6 rounded-3xl border border-slate-200 dark:border-slate-800/50 hover:shadow-xl hover:border-blue-500/30 transition-all group overflow-hidden relative"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -z-10 group-hover:bg-blue-500/10 transition-colors" />
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                                <Briefcase size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{job.title}</h3>
                                                <div className="flex items-center gap-4 mt-1">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                        <MapPin size={12} className="text-blue-500" /> {job.location}
                                                    </span>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                        <Calendar size={12} className="text-indigo-500" /> {job.createdAt ? new Date(job.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recently"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            <Badge label={job.type.replace("_", " ")} variant="blue" />
                                            {job.skills?.slice(0, 3).map((s, i) => (
                                                <Badge key={i} label={s} variant="slate" />
                                            ))}
                                            {job.skills && job.skills.length > 3 && (
                                                <span className="text-[9px] font-black text-slate-400 self-center">+{job.skills.length - 3} More</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8 md:gap-12">
                                        <div className="text-center">
                                            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{job._count?.applications || 0}</p>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-1.5 justify-center">
                                                <Users size={12} className="text-green-500" /> Applicants
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Link
                                                href={`/dashboard/employer/jobs/${job.id}`}
                                                className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700 transition-all border border-slate-100 dark:border-slate-700 shadow-sm"
                                            >
                                                <Edit3 size={18} />
                                            </Link>
                                            <Link
                                                href={`/dashboard/employer/jobs/${job.id}/discover`}
                                                className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-all border border-blue-100 dark:border-blue-800 shadow-sm"
                                                title="AI Discovery Match"
                                            >
                                                <Sparkles size={18} />
                                            </Link>
                                            <Link
                                                href={`/dashboard/employer/candidates?jobId=${job.id}`}
                                                className="h-12 px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 dark:hover:bg-blue-500 transition-all shadow-xl group/btn"
                                            >
                                                Review Pipeline
                                                <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
