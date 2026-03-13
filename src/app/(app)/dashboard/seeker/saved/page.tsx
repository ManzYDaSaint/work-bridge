"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Job } from "@/types";
import { BookmarkCheck, MapPin, Briefcase, ChevronRight, DollarSign, Trash2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/dashboard/ui";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface SavedJob {
    id: string;
    job_id: string;
    job: Job;
}

export default function SavedJobsPage() {
    const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSavedJobs = async () => {
        try {
            const res = await apiFetch("/api/seeker/saved-jobs");
            if (res.ok) {
                setSavedJobs(await res.json());
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSavedJobs();
    }, []);

    const handleRemove = async (jobId: string) => {
        try {
            const res = await apiFetch("/api/seeker/saved-jobs", {
                method: "POST",
                body: JSON.stringify({ jobId })
            });

            if (res.ok) {
                setSavedJobs((prev) => prev.filter((s) => s.job_id !== jobId));
                toast.info("Job removed from bookmarks");
            }
        } catch {
            toast.error("Failed to remove job.");
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Saved Jobs"
                subtitle="Review the roles you've bookmarked for later."
            />

            {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[1, 2].map((i) => (
                        <div key={i} className="h-48 bg-white rounded-2xl border border-slate-200 animate-pulse" />
                    ))}
                </div>
            ) : savedJobs.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200">
                    <EmptyState
                        icon={BookmarkCheck}
                        title="No Saved Jobs"
                        description="Explore the job board and bookmark roles to see them here."
                        action={{ label: "Find Jobs", href: "/dashboard/seeker/jobs" }}
                        iconColor="text-yellow-500"
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AnimatePresence mode="popLayout">
                        {savedJobs.map((item) => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center font-black text-lg text-slate-400 border border-slate-100">
                                            {item.job.employer?.companyName?.[0] || "?"}
                                        </div>
                                        <button
                                            onClick={() => handleRemove(item.job_id)}
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            title="Remove from saved"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    <h3 className="font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                        {item.job.title}
                                    </h3>
                                    <p className="text-sm font-bold text-slate-500 mb-4">
                                        {item.job.employer?.companyName}
                                    </p>
                                    <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-400">
                                        <span className="flex items-center gap-1.5">
                                            <MapPin size={12} className="text-blue-500" />
                                            {item.job.location}
                                        </span>
                                        <span className="flex items-center gap-1.5 capitalize">
                                            <Briefcase size={12} className="text-indigo-500" />
                                            {item.job.type}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                                    {item.job.salary_range ? (
                                        <span className="text-xs font-black text-green-600 bg-green-50 px-2.5 py-1 rounded-lg">
                                            {item.job.salary_range}
                                        </span>
                                    ) : <div />}

                                    <Link
                                        href="/dashboard/seeker/jobs"
                                        className="text-xs font-black text-blue-600 flex items-center gap-1 hover:underline"
                                    >
                                        Apply Now <ChevronRight size={14} />
                                    </Link>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
