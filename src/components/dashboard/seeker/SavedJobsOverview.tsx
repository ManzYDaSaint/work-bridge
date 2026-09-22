"use client";

import { useState, useMemo } from "react";
import { Bookmark, Trash2, MapPin, Building2, ExternalLink, Banknote } from "lucide-react";
import { PageHeader, EmptyState, Badge, SearchInput } from "@/components/dashboard/ui";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import JobDetailModal, { ExtendedJob } from "@/components/jobs/JobDetailModal";
import { ScreeningAnswer, SavedJob } from "@/types";
import { cn } from "@/lib/utils";

interface SavedJobsOverviewProps {
    savedEntries: SavedJob[];
    appliedJobIds: Set<string>;
}

export default function SavedJobsOverview({ savedEntries, appliedJobIds }: SavedJobsOverviewProps) {
    const [selectedJob, setSelectedJob] = useState<ExtendedJob | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const router = useRouter();

    const handleRemove = async (jobId: string) => {
        try {
            const res = await fetch("/api/seeker/saved-jobs", { 
                method: "POST", 
                body: JSON.stringify({ jobId }) 
            });
            if (res.ok) {
                router.refresh();
                toast.success("Job removed from saved list.");
            }
        } catch {
            toast.error("Failed to remove saved job.");
        }
    };

    const handleApply = async (jobId: string, screeningAnswers?: Record<string, ScreeningAnswer>) => {
        try {
            const res = await fetch(`/api/jobs/${jobId}/apply`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ screeningAnswers: screeningAnswers || {} }),
            });
            if (res.ok) {
                router.refresh();
                toast.success("Application sent.");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to apply");
            }
        } catch {
            toast.error("Failed to apply");
        }
    };

    const filteredEntries = useMemo(() => {
        return savedEntries.filter(({ job }) => {
            if (!job) return true;
            const query = searchQuery.toLowerCase();
            const title = job.title?.toLowerCase() || "";
            const company = (job.display_company_name || job.employer?.companyName || "").toLowerCase();
            return title.includes(query) || company.includes(query);
        });
    }, [savedEntries, searchQuery]);

    const getUrgencyBadge = (deadline?: string) => {
        if (!deadline) return null;
        const now = new Date();
        const end = new Date(deadline);
        const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/40">🔴 Closed</span>;
        }
        if (diffDays <= 3) {
            return <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/40 animate-pulse">⏳ {diffDays} {diffDays === 1 ? "day" : "days"} left</span>;
        }
        return <span className="inline-flex items-center text-[10px] font-semibold text-slate-400 dark:text-slate-500">Closes in {diffDays}d</span>;
    };

    const summaryCards = [
        { label: "Saved Roles", value: savedEntries.length, tone: "border-amber-200 bg-amber-50/50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300" },
        { label: "Already Applied", value: Array.from(appliedJobIds).length, tone: "border-emerald-200 bg-emerald-50/50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300" },
        { label: "Ready to Act", value: savedEntries.filter(({ job }) => job && !appliedJobIds.has(job.id)).length, tone: "border-sky-200 bg-sky-50/50 text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-300" },
    ];

    return (
        <div className="space-y-6 pb-20">
            <PageHeader title="Saved Jobs" subtitle="Your personal shortlist of bookmarked roles to review and apply to anytime." />

            {/* Metric Summary Row */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {summaryCards.map((card) => (
                    <div key={card.label} className={`flex flex-col justify-between rounded-3xl border p-4 ${card.tone}`}>
                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{card.label}</p>
                        <p className="mt-1 text-2xl font-black tracking-tight">{card.value}</p>
                    </div>
                ))}
            </div>

            {/* Search Bar */}
            <div className="flex justify-end">
                <SearchInput
                    value={searchQuery}
                    onChange={(val) => setSearchQuery(val)}
                    placeholder="Search saved jobs..."
                    className="w-full sm:w-72"
                />
            </div>

            {/* Saved Jobs Grid Feed */}
            {filteredEntries.length === 0 ? (
                <div className="rounded-3xl border border-stone-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                    <EmptyState 
                        icon={Bookmark} 
                        title="Your shortlist is empty" 
                        description="Find roles that interest you in the recommended feed and save them here to build your shortlist." 
                        action={{ label: "View Recommendations", href: "/dashboard/seeker/recommendations" }} 
                        iconColor="text-[#16324f]" 
                    />
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {filteredEntries.map(({ id, job_id, job }) => {
                        const isApplied = job ? appliedJobIds.has(job.id) : false;
                        const companyName = job ? (job.display_company_name || job.employer?.companyName || "Company") : "";

                        return (
                            <div
                                key={id}
                                className="group flex flex-col justify-between rounded-3xl border border-stone-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:border-stone-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 space-y-4"
                            >
                                <div className="space-y-3">
                                    {/* Top Row: Status Badge & Delete Action */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            {job ? (
                                                isApplied ? (
                                                    <Badge label="Applied" variant="green" />
                                                ) : (
                                                    <Badge label="Saved" variant="secondary" />
                                                )
                                            ) : (
                                                <Badge label="Inactive" variant="outline" />
                                            )}
                                            {job && getUrgencyBadge((job as any).deadline)}
                                        </div>

                                        <button
                                            onClick={() => handleRemove(job_id)}
                                            className="rounded-xl border border-stone-200/80 p-2 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-800 dark:text-slate-500 dark:hover:border-rose-900 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition"
                                            title="Remove from saved"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    {/* Role Title & Employer */}
                                    <div>
                                        <h3
                                            onClick={() => job && setSelectedJob(job)}
                                            className={cn(
                                                "text-base font-bold tracking-tight text-slate-900 line-clamp-1 dark:text-white transition-colors",
                                                job ? "cursor-pointer group-hover:text-[#16324f] dark:group-hover:text-amber-400" : "text-slate-400 dark:text-slate-500"
                                            )}
                                        >
                                            {job?.title || "Position no longer active"}
                                        </h3>
                                        <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                                            <Building2 size={12} className="shrink-0" />
                                            <span>{job ? companyName : "This role was filled or unlisted."}</span>
                                        </p>
                                    </div>

                                    {/* Micro-Metrics Strip */}
                                    {job && (
                                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                                            {job.location && (
                                                <span className="inline-flex items-center gap-1 rounded-xl bg-stone-100 px-2.5 py-1 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                    <MapPin size={12} className="text-slate-400" />
                                                    {job.location}
                                                </span>
                                            )}
                                            {job.salary_range && (
                                                <span className="inline-flex items-center gap-1 rounded-xl bg-stone-100 px-2.5 py-1 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                    <Banknote size={12} className="text-emerald-600 dark:text-emerald-400" />
                                                    {job.salary_range}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Footer Action */}
                                {job && (
                                    <div className="flex items-center gap-2 border-t border-stone-100 pt-3.5 dark:border-slate-800">
                                        <button
                                            onClick={() => setSelectedJob(job)}
                                            className="flex-1 rounded-2xl border border-stone-200 bg-stone-50 py-2 text-center text-xs font-bold text-slate-700 hover:bg-stone-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 transition"
                                        >
                                            View Details
                                        </button>
                                        <button
                                            onClick={() => setSelectedJob(job)}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#16324f] py-2 text-xs font-bold text-white transition hover:bg-[#16324f]/90 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300"
                                        >
                                            {isApplied ? "Applied" : "Apply Now"} <ExternalLink size={13} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {selectedJob && (
                <JobDetailModal
                    job={selectedJob}
                    isSaved={true}
                    isApplied={appliedJobIds.has(selectedJob.id)}
                    onClose={() => setSelectedJob(null)}
                    onSave={() => handleRemove(selectedJob.id)}
                    onApply={(answers) => handleApply(selectedJob.id, answers)}
                />
            )}
        </div>
    );
}

