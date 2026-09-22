"use client";

import { useState } from "react";
import JobDetailModal, { ExtendedJob } from "@/components/jobs/JobDetailModal";
import { RecommendedJob } from "@/services/recommendation.service";
import { 
    Sparkles, Briefcase, Target, ShieldCheck, 
    ArrowUpRight, Info, CheckCircle2, X
} from "lucide-react";
import { toast } from "sonner";
import SkillGapModal from "@/components/dashboard/seeker/SkillGapModal";
import { SkillGapService, SkillGapAnalysis } from "@/services/skill-gap.service";
import { MatchScoreBadge } from "@/components/matching/UniversalMatchComponents";

export default function RecommendedJobsClient({ 
    jobs, 
}: { 
    jobs: RecommendedJob[], 
}) {
    const [selectedJob, setSelectedJob] = useState<RecommendedJob | null>(null);
    const [breakdownModalJob, setBreakdownModalJob] = useState<RecommendedJob | null>(null);
    const [skillGapAnalysis, setSkillGapAnalysis] = useState<SkillGapAnalysis | null>(null);
    const [matchFilter, setMatchFilter] = useState<"ALL" | "HIGH" | "MEDIUM">("ALL");

    const handleOpenSkillGap = (job: RecommendedJob) => {
        const matched = job.hard_match_breakdown.skills.matched || [];
        const analysis = SkillGapService.analyze(matched, "", job);
        setSkillGapAnalysis(analysis);
    };

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

        const employerName = (job.employer as any)?.companyName || (job.employer as any)?.company_name || "Verified Employer";

        return (
            <div 
                key={job.id} 
                className="group relative overflow-hidden rounded-3xl border border-stone-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md"
            >
                {/* Header row with Company Avatar / Match score */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5 min-w-0">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 font-bold shrink-0 border border-amber-500/20">
                            <Briefcase className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="truncate text-base font-bold text-slate-900 dark:text-white sm:text-lg group-hover:text-[#16324f] dark:group-hover:text-amber-300 transition-colors">
                                {job.title}
                            </h3>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                                {employerName} {job.location ? `• ${job.location}` : ""}
                            </p>
                        </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1">
                        <MatchScoreBadge score={requirementPct} qualificationPassed={job.hard_match_breakdown.qualification.passed} />
                    </div>
                </div>

                {/* Micro metrics strip (Minimalist 3-Pill Layout) */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {/* Qualification Gate Pill */}
                    <div className="flex items-center gap-1.5 rounded-xl bg-stone-50 px-3 py-2 border border-stone-100 dark:bg-slate-800/80 dark:border-slate-800">
                        <ShieldCheck size={14} className={job.hard_match_breakdown.qualification.passed ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"} />
                        <div className="min-w-0">
                            <span className="block text-[10px] text-slate-400 font-medium">Qualification</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                                {job.hard_match_breakdown.qualification.passed ? "Passed Gate" : "Needs Review"}
                            </span>
                        </div>
                    </div>

                    {/* Skill Gap Analysis Pill */}
                    <button
                        type="button"
                        onClick={() => handleOpenSkillGap(job)}
                        className="flex items-center gap-1.5 rounded-xl bg-amber-50/60 px-3 py-2 border border-amber-200/60 text-left transition hover:bg-amber-100/70 dark:bg-amber-950/20 dark:border-amber-900/40"
                    >
                        <Target size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                            <span className="block text-[10px] text-amber-700 dark:text-amber-300 font-medium">Skill Match</span>
                            <span className="font-bold text-amber-900 dark:text-amber-200 truncate block">
                                {matchedSkillsCount}/{requiredSkillsCount} Matched
                            </span>
                        </div>
                    </button>

                    {/* AI Scoring Breakdown Pill */}
                    <button
                        type="button"
                        onClick={() => setBreakdownModalJob(job)}
                        className="col-span-2 sm:col-span-1 flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 border border-stone-200/70 text-left transition hover:bg-slate-100 dark:bg-slate-800/80 dark:border-slate-800"
                    >
                        <Info size={14} className="text-[#16324f] dark:text-slate-300 shrink-0" />
                        <div className="min-w-0 flex-1">
                            <span className="block text-[10px] text-slate-400 font-medium">AI Insights</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                                View Breakdown →
                            </span>
                        </div>
                    </button>
                </div>

                {/* Match reason notice chip */}
                {job.hard_match_reasons.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50/70 px-3 py-2 text-xs text-emerald-900 border border-emerald-200/60 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-300">
                        <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <p className="truncate text-[11px] font-medium">{job.hard_match_reasons[0]}</p>
                    </div>
                )}

                {/* Bottom Action bar */}
                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={() => setBreakdownModalJob(job)}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
                    >
                        Why it matches
                    </button>

                    <button
                        type="button"
                        onClick={() => setSelectedJob(job)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#16324f] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:opacity-90 active:scale-95 dark:bg-slate-100 dark:text-slate-900"
                    >
                        View & Apply
                        <ArrowUpRight size={14} />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-24">
            {/* 1. Editorial Header with Left Accent Line */}
            <div className="border-b border-stone-200/80 pb-5 dark:border-slate-800">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4 min-w-0">
                        {/* Accent Bar */}
                        <div className="w-1.5 h-12 rounded-full bg-amber-500 shrink-0 mt-0.5" />
                        
                        <div className="min-w-0">
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                                Recommended Job Matches
                            </h1>
                            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
                                Vacancies matching your qualification gate, work experience, and registered preferences.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Inline Tier Metrics (Editorial Pills) */}
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <button
                        type="button"
                        onClick={() => setMatchFilter("ALL")}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                            matchFilter === "ALL" 
                                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm" 
                                : "bg-stone-100 text-slate-700 hover:bg-stone-200 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                    >
                        <span>Total Matches</span>
                        <span className="rounded-full bg-white/20 dark:bg-slate-900/20 px-1.5 py-0.5 text-[10px]">{jobs.length}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setMatchFilter("HIGH")}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                            matchFilter === "HIGH" 
                                ? "bg-emerald-600 text-white shadow-sm" 
                                : "bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/40 dark:text-emerald-300"
                        }`}
                    >
                        <span>🔥 Strong Fits (80%+)</span>
                        <span className="rounded-full bg-emerald-700/20 px-1.5 py-0.5 text-[10px]">{highCount}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setMatchFilter("MEDIUM")}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                            matchFilter === "MEDIUM" 
                                ? "bg-amber-600 text-white shadow-sm" 
                                : "bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100 dark:bg-amber-950/30 dark:border-amber-900/40 dark:text-amber-300"
                        }`}
                    >
                        <span>⚡ Good Fits (50-79%)</span>
                        <span className="rounded-full bg-amber-700/20 px-1.5 py-0.5 text-[10px]">{medCount}</span>
                    </button>
                </div>
            </div>

            {/* 2. Swipeable Filter Strip */}
            <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-stone-200/80 bg-stone-100/70 p-1 dark:border-slate-800 dark:bg-slate-900/80 scrollbar-none">
                <button
                    onClick={() => setMatchFilter("ALL")}
                    className={`flex-1 rounded-xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap text-center ${
                        matchFilter === "ALL"
                            ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                    }`}
                >
                    All Matches ({jobs.length})
                </button>
                <button
                    onClick={() => setMatchFilter("HIGH")}
                    className={`flex-1 rounded-xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap text-center ${
                        matchFilter === "HIGH"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                    }`}
                >
                    🔥 High Qualification Gate 80%+ ({highCount})
                </button>
                <button
                    onClick={() => setMatchFilter("MEDIUM")}
                    className={`flex-1 rounded-xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap text-center ${
                        matchFilter === "MEDIUM"
                            ? "bg-amber-600 text-white shadow-sm"
                            : "text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
                    }`}
                >
                    ⚡ Good Fits 50-79% ({medCount})
                </button>
            </div>

            {/* 3. Job Match Cards List */}
            <div className="space-y-4">
                {filteredJobs.length === 0 ? (
                    <div className="py-16 text-center rounded-3xl border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6">
                        <Sparkles className="mx-auto h-10 w-10 text-amber-500/60" />
                        <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">No matches in this category</h3>
                        <p className="mt-1 text-xs text-slate-500">Switch to &quot;All Matches&quot; to inspect all available positions.</p>
                        <button
                            onClick={() => setMatchFilter("ALL")}
                            className="mt-4 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900"
                        >
                            Reset Filter
                        </button>
                    </div>
                ) : (
                    filteredJobs.map((job) => renderJobCard(job))
                )}
            </div>

            {/* Match Breakdown Sheet / Modal */}
            {breakdownModalJob && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 p-0 sm:p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-5 animate-in slide-in-from-bottom duration-200">
                        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
                            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-amber-500" /> Match Score Breakdown
                            </h3>
                            <button
                                onClick={() => setBreakdownModalJob(null)}
                                className="text-slate-400 hover:text-slate-700 dark:hover:text-white font-bold text-sm"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Vacancy</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{breakdownModalJob.title}</p>
                            <p className="text-xs text-slate-500">{(breakdownModalJob.employer as any)?.companyName || "Employer"}</p>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="rounded-2xl border border-stone-200/80 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-950/40 space-y-1.5">
                                <div className="flex justify-between items-center font-bold">
                                    <span>🎓 Qualification Gate (80% Weight)</span>
                                    <span className={breakdownModalJob.hard_match_breakdown.qualification.passed ? "text-emerald-600" : "text-rose-500"}>
                                        {breakdownModalJob.hard_match_breakdown.qualification.passed ? "✓ MET (80 pts)" : "✗ BELOW (0 pts)"}
                                    </span>
                                </div>
                                <p className="text-slate-600 dark:text-slate-400">
                                    Required Qualification: <strong>{breakdownModalJob.qualification || "Any"}</strong>
                                </p>
                            </div>

                            <div className="rounded-2xl border border-stone-200/80 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-950/40 space-y-1.5">
                                <div className="flex justify-between items-center font-bold">
                                    <span>💼 Experience Requirement (10% Weight)</span>
                                    <span className="text-amber-600 font-bold">
                                        {breakdownModalJob.hard_match_breakdown.experience.score ?? 10}/10 pts
                                    </span>
                                </div>
                                <p className="text-slate-600 dark:text-slate-400">
                                    Minimum Years Experience: <strong>{breakdownModalJob.minimum_years_experience ?? 0} years</strong>
                                </p>
                            </div>

                            <div className="rounded-2xl border border-stone-200/80 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-950/40 space-y-1.5">
                                <div className="flex justify-between items-center font-bold">
                                    <span>🧠 Skills &amp; Semantic Match (10% Weight)</span>
                                    <span className="text-emerald-600 font-bold">
                                        {breakdownModalJob.hard_match_breakdown.skills.score ?? 10}/10 pts
                                    </span>
                                </div>
                                <p className="text-slate-600 dark:text-slate-400">
                                    Matched Skills: <strong>{breakdownModalJob.hard_match_breakdown.skills.matched?.join(", ") || "Semantic vector aligned"}</strong>
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setBreakdownModalJob(null)}
                            className="w-full rounded-2xl bg-slate-900 py-3 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 transition"
                        >
                            Close Breakdown
                        </button>
                    </div>
                </div>
            )}

            {selectedJob && (
                <JobDetailModal
                    job={selectedJob as unknown as ExtendedJob}
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

            <SkillGapModal
                isOpen={Boolean(skillGapAnalysis)}
                onClose={() => setSkillGapAnalysis(null)}
                analysis={skillGapAnalysis}
            />
        </div>
    );
}
