"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    X,
    MapPin,
    Briefcase,
    DollarSign,
    CalendarDays,
    Clock,
    Tag,
    Building2,
    CheckCircle2,
    Bookmark,
    BookmarkCheck,
    ExternalLink,
    ShieldCheck,
    AlertTriangle,
} from "lucide-react";
import { cn, timeAgo, formatJobType, formatWorkMode } from "@/lib/utils";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useUser } from "@/context/UserContext";
import { Job, ScreeningAnswer } from "@/types";
import { CompanyAvatar } from "@/components/dashboard/ui";
export { CompanyAvatar } from "@/components/dashboard/ui";

export interface ExtendedJob extends Omit<Job, "employer"> {
    employer: {
        companyName?: string;
        id?: string;
        logoUrl?: string | null;
        industry?: string | null;
        website?: string | null;
        description?: string | null;
        location?: string | null;
        recruiterVerified?: boolean;
    } | null;
    createdAt?: string;
    _count?: { applications: number };
}

interface SeekerProfileData {
    role: string;
    jobSeeker?: {
        completion: number;
        isSubscribed: boolean;
        applicationsThisMonth: number;
        skills?: string[];
    };
}

export type PublicViewerMode = "guest" | "employer" | "admin";

export default function JobDetailModal({
    job,
    isSaved,
    isApplied,
    publicMode = false,
    publicViewerMode = "guest",
    onReport,
    onClose,
    onSave,
    onApply,
}: {
    job: ExtendedJob;
    isSaved: boolean;
    isApplied: boolean;
    publicMode?: boolean;
    publicViewerMode?: PublicViewerMode;
    onReport?: () => void;
    onClose: () => void;
    onSave: () => void;
    onApply: (answers?: Record<string, ScreeningAnswer>) => void;
}) {
    const { user } = useUser();
    const postedTime = timeAgo(job.createdAt);

    const effectiveCompletion = user?.jobSeeker?.completion ?? 0;
    const effectiveIsSubscribed = user?.jobSeeker?.isSubscribed ?? false;
    const effectiveApplicationsThisMonth = user?.jobSeeker?.applicationsThisMonth ?? 0;

    const isProfileIncomplete = effectiveCompletion < 60; // Lowered threshold since resume is removed
    const isLimitReached = !effectiveIsSubscribed && effectiveApplicationsThisMonth >= 3; // Standardized limit
    const [screeningAnswers, setScreeningAnswers] = useState<Record<string, ScreeningAnswer>>({});
    const effectiveSkills = user?.jobSeeker?.skills ?? [];
    const normalizedSeekerSkills = effectiveSkills.map((skill) => skill.trim().toLowerCase());
    const missingMustHaveSkills = (job.must_have_skills || [])
        .filter((skill) => !normalizedSeekerSkills.includes(skill.trim().toLowerCase()));

    useEffect(() => {
        setScreeningAnswers({});
    }, [job.id]);

    const screeningQuestions = job.screening_questions || [];
    const canSubmitApplication = screeningQuestions.every((question) => !!screeningAnswers[question.id]);


    console.log(job.employer?.description || "No description available");

    return (
        <>
            <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-sm"
            />
            <motion.aside
                key="panel"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 280, damping: 32 }}
                className="fixed right-0 top-0 z-[60] flex h-full w-full max-w-xl flex-col overflow-y-auto bg-[#fbf8f1] shadow-2xl dark:bg-slate-950"
            >
                <div className="sticky top-0 z-10 border-b border-stone-200 bg-[#fbf8f1]/95 px-6 pb-5 pt-6 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <CompanyAvatar logoUrl={job.employer?.logoUrl} name={job.employer?.companyName || ""} size="md" />
                            <div>
                                <h2 className="text-xl font-semibold leading-tight text-slate-900 dark:text-white">{job.title}</h2>
                                <div className="mt-0.5 flex items-center gap-1.5">
                                    <Building2 size={13} className="text-slate-400" />
                                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{job.employer?.companyName || "Company"}</span>
                                    {job.employer?.recruiterVerified ? (
                                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
                                            <ShieldCheck size={13} />
                                            Verified recruiter
                                        </span>
                                    ) : (
                                        <CheckCircle2 size={13} className="text-[#a65a2e]" />
                                    )}
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="shrink-0 rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 space-y-8 px-6 py-6">
                    {!publicMode && isProfileIncomplete && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Complete your profile to apply.</p>
                            <p className="mt-1 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                                Your profile is {effectiveCompletion}% complete. WorkBridge requires a partially finished profile before applications go out.
                            </p>
                            <Link href="/dashboard/seeker/profile" className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 hover:underline dark:text-amber-300">
                                Finish profile <ExternalLink size={12} />
                            </Link>
                        </div>
                    )}

                    {!publicMode && !isProfileIncomplete && isLimitReached && (
                        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
                            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Monthly application limit reached.</p>
                            <p className="mt-1 text-xs leading-relaxed text-blue-700 dark:text-blue-400">
                                Upgrade your seeker plan for more applications and extra discovery features.
                            </p>
                        </div>
                    )}

                    {!publicMode && !isProfileIncomplete && !isLimitReached && !effectiveIsSubscribed && (
                        <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
                            <div className="flex items-center gap-3">
                                <Clock size={16} className="text-slate-400" />
                                <p className="text-xs font-medium text-slate-500">
                                    Free tier: <span className="font-semibold text-slate-700 dark:text-slate-300">{effectiveApplicationsThisMonth}/1</span> applications this month
                                </p>
                            </div>
                            <Link href="/dashboard/seeker" className="text-[11px] font-semibold text-[#16324f] hover:underline dark:text-white">
                                Upgrade
                            </Link>
                        </div>
                    )}

                    {!publicMode && (
                        <div className="rounded-2xl border border-stone-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Application readiness</h3>
                            {missingMustHaveSkills.length > 0 ? (
                                <div className="space-y-2">
                                    <p className="inline-flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                                        <AlertTriangle size={14} />
                                        You are missing some must-have skills for this role.
                                    </p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                        Missing: {missingMustHaveSkills.join(", ")}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm text-emerald-700 dark:text-emerald-300">Your listed skills align with this role&apos;s required skills.</p>
                            )}
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                Tip: tailor your profile summary and experience to reflect the must-have list before submitting.
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                        {[
                            { icon: MapPin, label: "Location", value: job.location || "N/A", color: "text-blue-500" },
                            { icon: Briefcase, label: "Work mode", value: formatWorkMode(job.work_mode), color: "text-emerald-500" },
                            { icon: Briefcase, label: "Job type", value: formatJobType(job.type || ""), color: "text-indigo-500" },
                            { icon: DollarSign, label: "Compensation", value: job.salary_range || "Not specified", color: "text-green-500" },
                            {
                                icon: CalendarDays,
                                label: "Deadline",
                                value: job.deadline ? new Date(job.deadline).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "Open ended",
                                color: "text-orange-500",
                            },
                        ].map(({ icon: Icon, label, value, color }) => (
                            <div key={label} className="rounded-2xl border border-stone-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-800/60">
                                <div className="mb-1.5 flex items-center gap-2">
                                    <Icon size={14} className={color} />
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</span>
                                </div>
                                <p className="text-sm font-medium capitalize text-slate-800 dark:text-slate-200">{value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                        {postedTime && <span className="flex items-center gap-1.5"><Clock size={14} />Posted {postedTime}</span>}
                    </div>

                    {job.description && (
                        <div>
                            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">About the role</h3>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">{job.description}</p>
                        </div>
                    )}

                    {job.skills?.length > 0 && (
                        <div>
                            <div className="mb-3 flex items-center gap-2">
                                <Tag size={14} className="text-slate-400" />
                                <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Skills</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {job.skills.map((skill, i) => (
                                    <span key={i} className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {(job.must_have_skills?.length || job.nice_to_have_skills?.length || job.minimum_years_experience || screeningQuestions.length > 0) && (
                        <div className="rounded-2xl border border-stone-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-800/50">
                            <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Screening requirements</h3>
                            {job.must_have_skills?.length ? (
                                <div className="mb-4">
                                    <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Must-have skills</p>
                                    <div className="flex flex-wrap gap-2">
                                        {job.must_have_skills.map((skill, i) => (
                                            <span key={`${skill}-${i}`} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                            {job.nice_to_have_skills?.length ? (
                                <div className="mb-4">
                                    <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Nice-to-have skills</p>
                                    <div className="flex flex-wrap gap-2">
                                        {job.nice_to_have_skills.map((skill, i) => (
                                            <span key={`${skill}-${i}`} className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                            {job.minimum_years_experience ? (
                                <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                                    Minimum experience: <span className="font-semibold text-slate-900 dark:text-white">{job.minimum_years_experience} year{job.minimum_years_experience === 1 ? "" : "s"}</span>
                                </p>
                            ) : null}
                            {screeningQuestions.length > 0 ? (
                                <div className="space-y-4">
                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Application questions</p>
                                    {screeningQuestions.map((question) => (
                                        <div key={question.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{question.question}</p>
                                                <span className="text-[10px] uppercase tracking-widest text-slate-400">{question.required ? "Required" : "Optional"}</span>
                                            </div>
                                            <div className="mt-3 flex gap-2">
                                                {(["YES", "NO"] as ScreeningAnswer[]).map((answer) => (
                                                    <button
                                                        key={answer}
                                                        type="button"
                                                        onClick={() => setScreeningAnswers((prev) => ({ ...prev, [question.id]: answer }))}
                                                        className={cn(
                                                            "rounded-xl border px-4 py-2 text-xs font-semibold transition-colors",
                                                            screeningAnswers[question.id] === answer
                                                                ? "border-[#16324f] bg-[#16324f] text-white"
                                                                : "border-stone-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                                                        )}
                                                    >
                                                        {answer === "YES" ? "Yes" : "No"}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    )}

                    <div className="rounded-2xl border border-stone-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-800/50">
                        <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">About the company</h3>
                        <div className="mb-3 flex items-center gap-4">
                            <CompanyAvatar logoUrl={job.employer?.logoUrl} name={job.employer?.companyName || ""} size="sm" />
                            <div>
                                <p className="font-semibold text-slate-900 dark:text-white">{job.employer?.companyName || "Company"}</p>
                                {job.employer?.industry && <p className="text-xs font-medium text-slate-400">{job.employer.industry}</p>}
                            </div>
                        </div>
                        {job.employer?.location && <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500"><MapPin size={13} />{job.employer.location}</p>}
                        {job.employer?.website && (
                            <a href={job.employer.website} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[#16324f] hover:underline dark:text-slate-200">
                                <ExternalLink size={12} />
                                {job.employer.website.replace(/^https?:\/\//, "")}
                            </a>
                        )}
                        {job.employer?.description && (
                            <p className="mt-2 text-sm text-slate-500">{job.employer.description}</p>
                        )}
                    </div>
                </div>

                <div className="sticky bottom-0 flex flex-col gap-3 border-t border-stone-200 bg-[#fbf8f1]/95 px-6 py-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:flex-row sm:items-center">
                    {publicMode ? (
                        publicViewerMode === "employer" ? (
                            <Link
                                href="/dashboard/employer"
                                className="flex w-full items-center justify-center rounded-xl bg-[#16324f] py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-slate-900"
                            >
                                Open employer dashboard
                            </Link>
                        ) : publicViewerMode === "admin" ? (
                            <Link
                                href="/dashboard/admin"
                                className="flex w-full items-center justify-center rounded-xl bg-[#16324f] py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-slate-900"
                            >
                                Open admin
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 py-3.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                                >
                                    Sign in
                                </Link>
                                <Link
                                    href="/register"
                                    className="flex flex-1 items-center justify-center rounded-xl bg-[#16324f] py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-slate-900"
                                >
                                    Create account to apply
                                </Link>
                            </>
                        )
                    ) : (
                        <>
                        <div className="flex flex-1 gap-3">
                            <button
                                onClick={onSave}
                                className={cn(
                                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 transition-all sm:h-auto sm:w-auto sm:p-3.5",
                                    isSaved
                                        ? "border-[#16324f] bg-[#16324f] text-white dark:border-white dark:bg-white dark:text-slate-900"
                                        : "border-slate-300 text-slate-500 hover:border-slate-900 hover:text-slate-900 dark:border-slate-700 dark:hover:border-white dark:hover:text-white"
                                )}
                            >
                                {isSaved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                            </button>
                            {isApplied ? (
                                <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 py-3 text-sm font-bold text-green-600 dark:border-green-800 dark:bg-green-900/20 sm:py-3.5">
                                    <CheckCircle2 size={18} /> Applied
                                </div>
                            ) : isProfileIncomplete ? (
                                <button disabled className="flex-1 cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 py-3 text-xs font-bold text-slate-400 dark:border-slate-700 dark:bg-slate-800 sm:py-3.5 sm:text-sm">
                                    Complete Profile to Apply
                                </button>
                            ) : isLimitReached ? (
                                <button disabled className="flex-1 cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 py-3 text-xs font-bold text-slate-400 dark:border-slate-700 dark:bg-slate-800 sm:py-3.5 sm:text-sm">
                                    Monthly Limit Reached
                                </button>
                            ) : (
                                <button
                                    onClick={() => onApply(screeningAnswers)}
                                    disabled={!canSubmitApplication}
                                    className="flex-1 rounded-xl bg-[#16324f] py-3 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 sm:py-3.5"
                                >
                                    Apply now
                                </button>
                            )}
                        </div>
                        {onReport && (
                            <button
                                type="button"
                                onClick={onReport}
                                className="rounded-xl border border-rose-200 px-4 py-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/20 sm:py-3.5"
                            >
                                Report
                            </button>
                        )}
                        </>
                    )}
                </div>
            </motion.aside>
        </>
    );
}
