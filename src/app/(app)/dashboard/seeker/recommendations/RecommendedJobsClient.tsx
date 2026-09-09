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
        const requirementPct = Math.round(job.hard_match_score);
        const matchedSkillsCount = job.hard_match_breakdown.skills.matched?.length ?? 0;
        const requiredSkillsCount = Array.isArray(job.hard_match_breakdown.skills.required)
            ? job.hard_match_breakdown.skills.required.length
            : 0;
        const fitLabel = requirementPct >= 80 ? "Strong fit" : requirementPct >= 60 ? "Good fit" : "Explore";

        return (
            <div key={job.id} className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition hover:shadow-md">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 font-bold shrink-0">
                            <Briefcase className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="truncate text-base font-bold text-slate-900 dark:text-white sm:text-lg">{job.title}</h3>
                            <p className="text-xs text-slate-500 sm:text-sm">{(job.employer as any)?.companyName || (job.employer as any)?.company_name}</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-start gap-2 sm:items-end">
                        <Badge
                            variant={requirementPct >= 80 ? "green" : requirementPct >= 60 ? "yellow" : "slate"}
                        >
                            <Sparkles size={10} className="mr-1 inline" />
                            {fitLabel} • {requirementPct}%
                        </Badge>
                        {job.hard_match_reasons.length > 0 && (
                            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/40">
                                ✨ {job.hard_match_reasons[0]}
                            </span>
                        )}
                        <button
                            onClick={() => setSelectedJob(job)}
                            className="text-xs font-bold text-[#16324f] hover:underline dark:text-slate-200"
                        >
                            View details →
                        </button>
                    </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <p className="font-bold text-slate-900 dark:text-white">Qualification</p>
                        <p className="mt-1 text-sm font-black text-slate-800 dark:text-slate-200">
                            {job.hard_match_breakdown.qualification.passed ? "Matches" : "Needs review"}
                        </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <p className="font-bold text-slate-900 dark:text-white">Skills</p>
                        <p className="mt-1 text-sm font-black text-slate-800 dark:text-slate-200">{matchedSkillsCount}/{requiredSkillsCount}</p>
                    </div>
                    <button
                        onClick={() => setBreakdownModalJob(job)}
                        className="text-left rounded-2xl border border-emerald-200/80 bg-emerald-50/80 p-3 text-xs text-emerald-800 transition hover:bg-emerald-100/70 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
                    >
                        <p className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                            <span>Why this matches</span>
                            <span className="text-[10px] underline">Open</span>
                        </p>
                        <p className="mt-1 font-semibold text-emerald-800 dark:text-emerald-300">
                            {job.hard_match_breakdown.qualification.passed ? "Your profile aligns well" : "A few checks may still apply"}
                        </p>
                    </button>
                </div>

                {job.hard_match_reasons.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-200">
                        <p className="font-bold mb-0.5">What to keep in mind</p>
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
                subtitle="Jobs selected for your profile, experience, and qualification." 
            />

            <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Total matches</p>
                    <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{jobs.length}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Strong fits</p>
                    <p className="mt-2 text-2xl font-black text-emerald-800 dark:text-emerald-200">{highCount}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">Good fits</p>
                    <p className="mt-2 text-2xl font-black text-amber-800 dark:text-amber-200">{medCount}</p>
                </div>
            </div>

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
