"use client";

import { CheckCircle2, AlertTriangle, Sparkles, X, Target, ArrowRight } from "lucide-react";
import { SkillGapAnalysis } from "@/services/skill-gap.service";
import Link from "next/link";

interface SkillGapModalProps {
    isOpen: boolean;
    onClose: () => void;
    analysis: SkillGapAnalysis | null;
}

export default function SkillGapModal({ isOpen, onClose, analysis }: SkillGapModalProps) {
    if (!isOpen || !analysis) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                            <Target className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">AI Skill Gap Analysis</h2>
                            <p className="text-xs text-slate-500">{analysis.jobTitle} • {analysis.companyName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1.5 text-slate-400 hover:bg-stone-200 dark:hover:bg-slate-800"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6">
                    {/* Overall Match Progress */}
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                        <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-200">
                            <span className="flex items-center gap-1.5">
                                <Sparkles size={14} className="text-amber-500" />
                                Skill Coverage Rate
                            </span>
                            <span className="text-sm">{analysis.matchPercentage}%</span>
                        </div>
                        <div className="mt-2.5 relative h-2 w-full overflow-hidden rounded-full bg-amber-200/50 dark:bg-amber-950/60">
                            <div
                                className="h-full bg-amber-500 transition-all duration-500"
                                style={{ width: `${analysis.matchPercentage}%` }}
                            />
                        </div>
                    </div>

                    {/* Matched Skills */}
                    <div className="space-y-2">
                        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                            <CheckCircle2 size={14} className="text-emerald-500" />
                            Matched Skills ({analysis.matchedSkills.length})
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                            {analysis.matchedSkills.length > 0 ? (
                                analysis.matchedSkills.map((skill, i) => (
                                    <span key={i} className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/40">
                                        ✓ {skill}
                                    </span>
                                ))
                            ) : (
                                <p className="text-xs text-slate-400">No overlapping skills detected yet.</p>
                            )}
                        </div>
                    </div>

                    {/* Missing Must-Have Skills */}
                    {analysis.missingMustHave.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                <AlertTriangle size={14} className="text-rose-500" />
                                Missing Required Skills ({analysis.missingMustHave.length})
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                                {analysis.missingMustHave.map((skill, i) => (
                                    <span key={i} className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/40">
                                        ! {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Missing Nice-to-Have Skills */}
                    {analysis.missingNiceToHave.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                Missing Secondary Skills ({analysis.missingNiceToHave.length})
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                                {analysis.missingNiceToHave.map((skill, i) => (
                                    <span key={i} className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-semibold text-slate-600 border border-stone-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                                        + {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actionable Recommendations */}
                    <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Recommended Actions
                        </h4>
                        <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                            {analysis.recommendations.map((rec, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <ArrowRight size={14} className="mt-0.5 text-amber-500 shrink-0" />
                                    <span>{rec}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Link
                            href="/dashboard/seeker/profile"
                            className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-amber-400"
                        >
                            Update Profile Skills →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
