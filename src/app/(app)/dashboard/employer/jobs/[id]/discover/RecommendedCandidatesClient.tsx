"use client";

import { PageHeader, Badge } from "@/components/dashboard/ui";
import { Sparkles, Users, Lock, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MatchScoreBadge } from "@/components/matching/UniversalMatchComponents";

export default function RecommendedCandidatesClient({ 
    job,
    candidates, 
    usage, 
    limit,
    plan
}: { 
    job: any;
    candidates: any[]; 
    usage: number; 
    limit: number;
    plan: string;
}) {
    const router = useRouter();
    const isLocked = plan === "FREE" && usage >= limit;

    const renderCandidateCard = (candidate: any, index: number) => {
        const shouldBlur = isLocked && index >= 3;
        const requirementPct = Math.round(candidate.hard_match_score || 0);
        const qualBreakdown = candidate.hard_match_breakdown?.qualification;
        const isQualPassed = qualBreakdown?.passed ?? true;
        const verifiedCerts = candidate.verified_certificates || [];

        return (
            <div key={candidate.id} className="relative overflow-hidden rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className={`transition-all ${shouldBlur ? "blur-sm grayscale select-none pointer-events-none opacity-50" : ""}`}>
                    <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 dark:bg-slate-800 font-bold text-slate-500">
                                {candidate.full_name?.charAt(0).toUpperCase() || "?"}
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{candidate.full_name}</h3>
                                <p className="text-sm text-slate-500">{candidate.location || "No Location"}</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                            <MatchScoreBadge score={requirementPct} qualificationPassed={isQualPassed} />
                            {isQualPassed ? (
                                <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md dark:bg-emerald-950/40 dark:text-emerald-300">
                                    ✓ Qualification Aligned
                                </span>
                            ) : (
                                <span className="inline-flex items-center text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md dark:bg-amber-950/40 dark:text-amber-300">
                                    ⚠ Partial Qualification
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Candidate Qualification & Experience Badges */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        {candidate.qualification && (
                            <span className="rounded-md bg-stone-100 px-2.5 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                🎓 {candidate.qualification}
                            </span>
                        )}
                        {candidate.seniority_level && (
                            <span className="rounded-md bg-stone-100 px-2.5 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                💼 {candidate.seniority_level}
                            </span>
                        )}
                    </div>
                    
                    {candidate.bio && (
                        <p className="mt-3 text-sm text-slate-600 line-clamp-2 dark:text-slate-300">
                            {candidate.bio}
                        </p>
                    )}

                    {/* Verified Certificates Badge Section */}
                    {verifiedCerts.length > 0 && (
                        <div className="mt-3 space-y-1">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Verified Certificates</p>
                            <div className="flex flex-wrap gap-1.5">
                                {verifiedCerts.map((cert: string, i: number) => (
                                    <span key={i} className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                                        📜 {cert}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Matching Skills Breakdown */}
                    {candidate.skills && candidate.skills.length > 0 && (
                        <div className="mt-4 space-y-1.5">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Skills & Expertise</p>
                            <div className="flex flex-wrap gap-1.5">
                                {candidate.skills.slice(0, 6).map((skill: string, i: number) => {
                                    const jobSkills = [
                                        ...(job.skills || []),
                                        ...(job.must_have_skills || []),
                                        ...(job.nice_to_have_skills || [])
                                    ].map((s: string) => s.toLowerCase());
                                    
                                    const isMatching = jobSkills.some((js: string) => 
                                        js.includes(skill.toLowerCase()) || skill.toLowerCase().includes(js)
                                    );

                                    return (
                                        <span 
                                            key={i} 
                                            className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                                                isMatching 
                                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800" 
                                                    : "bg-stone-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                            }`}
                                        >
                                            {isMatching && "✓ "}
                                            {skill}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {!shouldBlur && (
                        <div className="mt-5 border-t border-stone-100 pt-4 dark:border-slate-800 flex justify-between items-center">
                            <span className="text-xs text-slate-400">
                                {candidate.completion ? `Profile ${candidate.completion}% complete` : ''}
                            </span>
                            <Link 
                                href={`/dashboard/employer/talent/${candidate.id}`}
                                className="inline-flex items-center text-sm font-semibold text-[#16324f] hover:underline dark:text-slate-200"
                            >
                                View Full Profile &rarr;
                            </Link>
                        </div>
                    )}
                </div>

                {shouldBlur && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm z-10">
                        <Lock className="h-8 w-8 text-slate-600 dark:text-slate-300 mb-2" />
                        <p className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Premium Feature</p>
                        <Link 
                            href="/dashboard/employer/billing" 
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
            <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
                <ChevronLeft size={16} /> Back to Job
            </button>

            <PageHeader 
                title={`AI Discovery: ${job.title}`} 
                subtitle="Candidates perfectly matched to your Job's Professional DNA." 
            />

            {!isLocked && plan === "FREE" && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
                    <div className="flex items-center gap-3">
                        <Sparkles className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                            You have viewed <strong>{usage}</strong> out of <strong>{limit}</strong> free discoveries this month.
                        </p>
                    </div>
                    <Link href="/dashboard/employer/billing" className="text-sm font-semibold text-blue-700 hover:underline dark:text-blue-400 shrink-0">
                        Upgrade for unlimited
                    </Link>
                </div>
            )}

            <div className="space-y-4">
                {candidates.length === 0 ? (
                    <div className="py-12 text-center">
                        <Users className="mx-auto h-12 w-12 text-slate-300" />
                        <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">No perfect matches yet</h3>
                        <p className="mt-2 text-slate-500">We couldn't find any candidates that closely match this role right now.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {candidates.map((candidate, idx) => renderCandidateCard(candidate, idx))}
                    </div>
                )}
            </div>
        </div>
    );
}
