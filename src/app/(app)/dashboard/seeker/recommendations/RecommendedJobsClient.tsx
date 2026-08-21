"use client";

import { useState } from "react";
import { PageHeader, Badge } from "@/components/dashboard/ui";
import JobDetailModal from "@/components/jobs/JobDetailModal";
import { RecommendedJob } from "@/services/recommendation.service";
import { Sparkles, Briefcase, Zap } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function RecommendedJobsClient({ 
    jobs, 
}: { 
    jobs: RecommendedJob[], 
}) {
    const [selectedJob, setSelectedJob] = useState<RecommendedJob | null>(null);
    const [breakdownModalJob, setBreakdownModalJob] = useState<RecommendedJob | null>(null);
    const [matchFilter, setMatchFilter] = useState<"ALL" | "HIGH" | "MEDIUM">("ALL");

    const filteredJobs = jobs.filter((j) => {
        const score = j.hard_match_score;
        if (matchFilter === "HIGH") return score >= 80;
        if (matchFilter === "MEDIUM") return score >= 50 && score < 80;
        return true;
    });

    const highCount = jobs.filter((j) => j.hard_match_score >= 80).length;
    const medCount = jobs.filter((j) => j.hard_match_score >= 50 && j.hard_match_score < 80).length;

    const renderJobCard = (job: RecommendedJob) => {
        const semanticPct = Math.round(job.similarity * 100);
        const requirementPct = Math.round(job.hard_match_score);
        const matchedSkillsCount = job.hard_match_breakdown.skills.matched?.length ?? 0;
        const requiredSkillsCount = Array.isArray(job.hard_match_breakdown.skills.required)
            ? job.hard_match_breakdown.skills.required.length
            : 0;

        return (
            <div key={job.id} className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition hover:shadow-md">
                <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 font-bold shrink-0">
                            <Briefcase className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">{job.title}</h3>
                            <p className="text-xs text-slate-500 sm:text-sm">{(job.employer as any)?.companyName || (job.employer as any)?.company_name}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <button
                            onClick={() => setBreakdownModalJob(job)}
                            className="cursor-pointer transition active:scale-95"
                            title="Click to view full match score breakdown"
                        >
                            <Badge 
                                variant={requirementPct >= 80 ? "green" : requirementPct >= 60 ? "yellow" : "slate"}
                            >
                                <Sparkles size={10} className="mr-1 inline" />
                                {requirementPct}% Match Breakdown 🔍
                            </Badge>
                        </button>
                        <button 
                            onClick={() => setSelectedJob(job)}
                            className="text-xs font-bold text-[#16324f] hover:underline dark:text-slate-200"
                        >
                            View Job Details →
                        </button>
                    </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <p className="font-bold text-slate-900 dark:text-white">Qualification Fit</p>
                        <p className="text-sm font-black text-slate-800 dark:text-slate-200">{Math.round(job.similarity * 100)}%</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <p className="font-bold text-slate-900 dark:text-white">Matched Skills</p>
                        <p className="text-sm font-black text-slate-800 dark:text-slate-200">{matchedSkillsCount}/{requiredSkillsCount}</p>
                    </div>
                    <button 
                        onClick={() => setBreakdownModalJob(job)}
                        className="text-left rounded-2xl bg-emerald-50/80 border border-emerald-200/60 p-3 text-xs text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-100/70 transition"
                    >
                        <p className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                            <span>🎓 Qualification Match</span>
                            <span className="text-[10px] text-emerald-600 font-bold underline">Details</span>
                        </p>
                        <p className="font-semibold mt-0.5">
                            {job.hard_match_breakdown.qualification.passed
                                ? (job.qualification ? `${job.qualification} (Qualified)` : "Qualification Met")
                                : "Below Requirement"}
                        </p>
                    </button>
                </div>

                {job.hard_match_reasons.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-200">
                        <p className="font-bold mb-0.5">Why you may not meet requirements</p>
                        <p className="leading-relaxed">{job.hard_match_reasons.join(" · ")}</p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-20">
            <PageHeader 
                title="Recommended for You" 
                subtitle="Jobs matched to your education level, skills, and professional experience." 
            />

            {/* Filter Chips Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                    onClick={() => setMatchFilter("ALL")}
                    className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                        matchFilter === "ALL"
                            ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                            : "bg-stone-100 text-slate-600 hover:bg-stone-200 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                >
                    All Matches ({jobs.length})
                </button>
                <button
                    onClick={() => setMatchFilter("HIGH")}
                    className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                        matchFilter === "HIGH"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-emerald-50 text-emerald-800 border border-emerald-200/70 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40"
                    }`}
                >
                    High Qualification Match 80%+ ({highCount})
                </button>
                <button
                    onClick={() => setMatchFilter("MEDIUM")}
                    className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                        matchFilter === "MEDIUM"
                            ? "bg-amber-600 text-white shadow-sm"
                            : "bg-amber-50 text-amber-800 border border-amber-200/70 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40"
                    }`}
                >
                    Medium Match 50-79% ({medCount})
                </button>
            </div>

            <div className="space-y-4">
                {filteredJobs.length === 0 ? (
                    <div className="py-12 text-center rounded-2xl border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                        <Sparkles className="mx-auto h-12 w-12 text-slate-300" />
                        <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">No matches in this filter category</h3>
                        <p className="mt-1 text-xs text-slate-500">Try switching to "All Matches" to see all available recommended positions.</p>
                    </div>
                ) : (
                    filteredJobs.map((job) => renderJobCard(job))
                )}
            </div>

            {/* Match Breakdown Modal */}
            {breakdownModalJob && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-5">
                        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
                            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-amber-500" /> AI Match Scoring Breakdown
                            </h3>
                            <button
                                onClick={() => setBreakdownModalJob(null)}
                                className="text-slate-400 hover:text-slate-700 dark:hover:text-white font-bold text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Target Vacancy</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{breakdownModalJob.title}</p>
                            <p className="text-xs text-slate-500">{(breakdownModalJob.employer as any)?.companyName || "Company"}</p>
                        </div>

                        <div className="space-y-3">
                            <div className="rounded-2xl border border-stone-200/80 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-950/40 space-y-2">
                                <div className="flex justify-between items-center text-xs font-bold">
                                    <span>🎓 Qualification Gate (80% Weight)</span>
                                    <span className={breakdownModalJob.hard_match_breakdown.qualification.passed ? "text-emerald-600" : "text-rose-500"}>
                                        {breakdownModalJob.hard_match_breakdown.qualification.passed ? "✓ MET (80/80 pts)" : "✗ BELOW (0/80 pts)"}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    Requirement: <strong>{breakdownModalJob.qualification || "Any"}</strong>
                                </p>
                            </div>

                            <div className="rounded-2xl border border-stone-200/80 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-950/40 space-y-2">
                                <div className="flex justify-between items-center text-xs font-bold">
                                    <span>💼 Experience Metric (10% Weight)</span>
                                    <span className="text-amber-600 font-bold">
                                        {breakdownModalJob.hard_match_breakdown.experience.score ?? 10}/10 pts
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    Required Experience: <strong>{breakdownModalJob.minimum_years_experience ?? 0} years</strong>
                                </p>
                            </div>

                            <div className="rounded-2xl border border-stone-200/80 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-950/40 space-y-2">
                                <div className="flex justify-between items-center text-xs font-bold">
                                    <span>🧠 Skills &amp; Semantic Match (10% Weight)</span>
                                    <span className="text-emerald-600 font-bold">
                                        {breakdownModalJob.hard_match_breakdown.skills.score ?? 10}/10 pts
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    Matched Skills: <strong>{breakdownModalJob.hard_match_breakdown.skills.matched?.join(", ") || "Semantic vector aligned"}</strong>
                                </p>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={() => setBreakdownModalJob(null)}
                                className="w-full rounded-2xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
                            >
                                Close Breakdown
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
