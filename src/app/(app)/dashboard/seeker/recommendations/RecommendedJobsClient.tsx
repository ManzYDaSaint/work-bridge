"use client";

import { useState } from "react";
import { PageHeader, SectionCard, Badge } from "@/components/dashboard/ui";
import JobDetailModal, { ExtendedJob } from "@/components/jobs/JobDetailModal";
import { Sparkles, Briefcase, Lock } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface JobWithScore extends ExtendedJob {
    similarity: number;
}

export default function RecommendedJobsClient({ 
    jobs, 
    usage, 
    limit 
}: { 
    jobs: JobWithScore[], 
    usage: number, 
    limit: number 
}) {
    const [selectedJob, setSelectedJob] = useState<ExtendedJob | null>(null);

    const isLocked = usage >= limit;

    const renderJobCard = (job: JobWithScore, index: number) => {
        // Blur out jobs after the top 5 if they are locked
        const shouldBlur = isLocked && index >= 5;
        const scorePct = Math.round(job.similarity * 100);

        return (
            <div key={job.id} className="relative overflow-hidden rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className={`transition-all ${shouldBlur ? "blur-sm grayscale select-none pointer-events-none opacity-50" : ""}`}>
                    <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-stone-100 dark:bg-slate-800">
                                <Briefcase className="h-6 w-6 text-slate-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{job.title}</h3>
                                <p className="text-sm text-slate-500">{(job.employer as any)?.companyName || (job.employer as any)?.company_name}</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <Badge 
                                variant={scorePct >= 70 ? "green" : scorePct >= 50 ? "yellow" : "slate"}
                            >
                                <Sparkles size={10} className="mr-1 inline" />
                                {scorePct}% Match
                            </Badge>
                            {!shouldBlur && (
                                <button 
                                    onClick={() => setSelectedJob(job as ExtendedJob)}
                                    className="text-sm font-semibold text-[#16324f] hover:underline dark:text-slate-200"
                                >
                                    View Details
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {shouldBlur && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm z-10">
                        <Lock className="h-8 w-8 text-slate-600 dark:text-slate-300 mb-2" />
                        <p className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Premium Feature</p>
                        <Link 
                            href="/dashboard/seeker/billing" 
                            className="rounded-lg bg-[#16324f] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
                        >
                            Upgrade to Unlock
                        </Link>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-20">
            <PageHeader 
                title="Recommended for You" 
                subtitle="Jobs semantically matched to your Professional DNA." 
            />

            {!isLocked && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
                    <div className="flex items-center gap-3">
                        <Sparkles className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                            You have viewed <strong>{usage}</strong> out of <strong>{limit}</strong> free recommendations.
                        </p>
                    </div>
                    <Link href="/dashboard/seeker/billing" className="text-sm font-semibold text-blue-700 hover:underline dark:text-blue-400 shrink-0">
                        Upgrade for unlimited
                    </Link>
                </div>
            )}

            <div className="space-y-4">
                {jobs.length === 0 ? (
                    <div className="py-12 text-center">
                        <Sparkles className="mx-auto h-12 w-12 text-slate-300" />
                        <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">No perfect matches yet</h3>
                        <p className="mt-2 text-slate-500">We couldn't find any jobs that closely match your profile right now. Try updating your skills or check back later.</p>
                    </div>
                ) : (
                    jobs.map((job, idx) => renderJobCard(job, idx))
                )}
            </div>

            {selectedJob && (
                <JobDetailModal
                    job={selectedJob}
                    isSaved={false}
                    isApplied={false}
                    onClose={() => setSelectedJob(null)}
                    onSave={() => toast.info("Job saved!")}
                    onApply={() => {
                        toast.success("Application started");
                        setSelectedJob(null);
                    }}
                />
            )}
        </div>
    );
}
