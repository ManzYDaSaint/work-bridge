"use client";

import { useState } from "react";
import Link from "next/link";
import { Briefcase, BookmarkCheck, CheckCircle2, Copy, AlertCircle, Crown, Sparkles, MessageSquare } from "lucide-react";
import { PageHeader, StatCard, SectionCard, Badge } from "@/components/dashboard/ui";
import JobAlertsManager from "@/components/dashboard/seeker/JobAlertsManager";
import { toast } from "sonner";
import OnboardingChecklist from "@/components/dashboard/OnboardingChecklist";
import JobDetailModal, { ExtendedJob } from "@/components/jobs/JobDetailModal";
import { ScreeningAnswer } from "@/types";
import { Application, SavedJob } from "@/types";
import { calculateProfileStrength } from "@/lib/profile-strength";

import { useOptionalUser } from "@/context/UserContext";

interface SeekerOverviewProps {
    user: any;
    applications: Application[];
    savedJobs: SavedJob[];
    appliedJobIds: Set<string>;
}

export default function SeekerOverview({ 
    user, 
    applications, 
    savedJobs, 
    appliedJobIds 
}: SeekerOverviewProps) {
    const userContext = useOptionalUser();
    const activeUser = userContext?.user || user;

    const [selectedJob, setSelectedJob] = useState<ExtendedJob | null>(null);
    const [localAppliedJobIds, setLocalAppliedJobIds] = useState<Set<string>>(appliedJobIds);

    const handleApply = async (jobId: string, screeningAnswers?: Record<string, ScreeningAnswer>) => {
        // Optimistic update
        setLocalAppliedJobIds(prev => new Set(prev).add(jobId));
        
        try {
            const res = await fetch(`/api/jobs/${jobId}/apply`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ screeningAnswers: screeningAnswers || {} }),
            });
            if (res.ok) {
                toast.success("Application sent.");
            } else {
                // Revert if error
                setLocalAppliedJobIds(prev => {
                    const next = new Set(prev);
                    next.delete(jobId);
                    return next;
                });
                const err = await res.json();
                toast.error(err.error || "Failed to apply");
            }
        } catch {
            setLocalAppliedJobIds(prev => {
                const next = new Set(prev);
                next.delete(jobId);
                return next;
            });
            toast.error("Failed to apply");
        }
    };

    const fullName = activeUser?.jobSeeker?.full_name || activeUser?.email?.split("@")[0] || "User";
    const isPremium = activeUser?.plan === "PREMIUM" || activeUser?.jobSeeker?.isSubscribed === true;

    // Use the new Profile Strength engine
    const strength = calculateProfileStrength(activeUser?.jobSeeker);
    const nextActions = [
        !activeUser?.jobSeeker?.full_name ? { title: "Add your full name", detail: "Personalise your professional profile.", href: "/dashboard/seeker/profile" } : null,
        !activeUser?.jobSeeker?.qualification ? { title: "Add your qualification", detail: "Highlight your highest education level.", href: "/dashboard/seeker/profile" } : null,
        !activeUser?.jobSeeker?.phone ? { title: "Connect WhatsApp", detail: "Get instant alerts and faster responses.", href: "/dashboard/seeker/profile" } : null,
        !activeUser?.jobSeeker?.skills?.length ? { title: "Add your skills", detail: "Improve discovery and match quality.", href: "/dashboard/seeker/profile" } : null,
        !(activeUser?.jobSeeker?.experience?.length) ? { title: "Add work experience", detail: "Show employers the value you bring.", href: "/dashboard/seeker/profile" } : null,
    ].filter(Boolean) as Array<{ title: string; detail: string; href: string }>;

    return (
        <div className="space-y-6 pb-20">
            <PageHeader title={`Hello, ${fullName}`} subtitle="Focus on the next actions that move your profile and job search forward." />

            <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${isPremium ? "bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300" : "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300"}`}>
                            {isPremium ? <Crown size={18} /> : <Sparkles size={18} />}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                {isPremium ? "Premium member" : "Job alerts ready"}
                            </p>
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                {isPremium
                                    ? "Priority matching and direct WhatsApp alerts are active."
                                    : "Get instant, high-match alerts for roles in Malawi."}
                            </p>
                        </div>
                    </div>

                    <Link
                        href="/dashboard/seeker/subscription"
                        className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                            isPremium
                                ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                                : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                        }`}
                    >
                        {isPremium ? <>
                            <MessageSquare size={14} /> Subscription Details
                        </> : <>
                            <Sparkles size={14} /> Upgrade for MWK 1,000/mo
                        </>}
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Applications" value={applications.length} icon={Briefcase} iconBg="bg-stone-100 dark:bg-slate-800" iconColor="text-[#16324f]" />
                <StatCard label="Shortlisted" value={applications.filter((a) => a.status === "SHORTLISTED" || a.status === "INTERVIEWING" || a.status === "ACCEPTED").length} icon={CheckCircle2} iconBg="bg-emerald-50 dark:bg-emerald-950/30" iconColor="text-emerald-600" />
                <StatCard label="Saved jobs" value={savedJobs.length} icon={BookmarkCheck} iconBg="bg-amber-50 dark:bg-amber-950/30" iconColor="text-amber-600" />
            </div>

            <OnboardingChecklist user={user} />

            <SectionCard title="Recommended for you" action={{ label: "View all matches", href: "/dashboard/seeker/recommendations" }}>
                <div className="space-y-3 p-6">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Your personalized job matches are built from your skills, qualification, work history, and preferred roles.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                        <div className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
                            <Sparkles size={16} className="text-amber-500" />
                            Personalized suggestions updated for your profile
                        </div>
                        <Link href="/dashboard/seeker/recommendations" className="inline-flex items-center gap-2 text-xs font-bold text-[#16324f] hover:underline dark:text-slate-200">
                            Open recommended jobs →
                        </Link>
                    </div>
                </div>
            </SectionCard>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div className="space-y-6">
                    <SectionCard title="Next actions">
                        <div className="space-y-3 p-6">
                            {nextActions.length > 0 ? (
                                nextActions.slice(0, 4).map((action) => (
                                    <Link
                                        key={action.title}
                                        href={action.href}
                                        className="flex items-start justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3 text-left transition-colors hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{action.title}</p>
                                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{action.detail}</p>
                                        </div>
                                        <span className="mt-0.5 text-sm text-slate-400">→</span>
                                    </Link>
                                ))
                            ) : (
                                <p className="text-sm text-slate-600 dark:text-slate-400">Your profile is in good shape. Keep your applications fresh and stay active.</p>
                            )}
                        </div>
                    </SectionCard>

                    <SectionCard title="Profile readiness">
                        <div className="space-y-6 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Profile Strength</p>
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        {strength.isComplete 
                                            ? "Your profile is fully optimized! You're in top shape for discovery." 
                                            : "Complete your profile to increase your chances of being discovered by employers."}
                                    </p>
                                </div>
                                <Badge label={`${strength.percentage}%`} variant={strength.percentage >= 80 ? "green" : strength.percentage >= 50 ? "yellow" : "red"} />
                            </div>

                            <div className="relative h-2 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-slate-800">
                                <div 
                                    className={`h-full transition-all duration-500 ease-out ${
                                        strength.percentage >= 80 ? "bg-emerald-500" : strength.percentage >= 50 ? "bg-amber-500" : "bg-rose-500"
                                    }`}
                                    style={{ width: `${strength.percentage}%` }}
                                />
                            </div>

                            {!strength.isComplete && (
                                <div className="space-y-3">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Suggested Improvements</p>
                                    <div className="grid grid-cols-1 gap-2">
                                        {strength.suggestions.slice(0, 3).map((suggestion, idx) => (
                                            <div key={idx} className="flex items-start gap-3 rounded-lg border border-stone-100 bg-stone-50 p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                                                <AlertCircle size={16} className="mt-0.5 text-amber-500 shrink-0" />
                                                <span>{suggestion}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Link href="/dashboard/seeker/profile" className="inline-flex items-center gap-2 text-sm font-semibold text-[#16324f] hover:underline dark:text-slate-200">
                                Complete profile →
                            </Link>
                        </div>
                    </SectionCard>

                    <JobAlertsManager />

                    <SectionCard title="Recent applications" action={applications.length ? { label: "View all", href: "/dashboard/seeker/applications" } : undefined}>
                        {applications.length === 0 ? (
                            <div className="px-6 py-16 text-center text-sm text-slate-500 dark:text-slate-400">You have not applied to any jobs yet.</div>
                        ) : (
                            <div className="divide-y divide-stone-200/70 dark:divide-slate-800">
                                {applications.slice(0, 5).map((app) => (
                                    <div key={app.id} className="flex items-center justify-between gap-4 px-6 py-4">
                                        <button
                                            type="button"
                                            onClick={() => app.job && setSelectedJob(app.job as unknown as ExtendedJob)}
                                            className="min-w-0 text-left hover:opacity-75 transition-opacity"
                                            disabled={!app.job}
                                        >
                                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{app.job?.title || "Unknown role"}</p>
                                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{(app.job?.employer as any)?.companyName || (app.job?.employer as any)?.company_name || "Company"}</p>
                                        </button>
                                        <Badge label={app.status} variant={app.status === "ACCEPTED" ? "green" : app.status === "REJECTED" ? "red" : "yellow"} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </SectionCard>
                </div>

                <div className="space-y-6">
                    {/* Enhanced Seeker DNA & Qualification Card */}
                    <SectionCard title="Professional Profile">
                        <div className="space-y-4 p-6">
                            <div className="flex items-center gap-3.5">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 font-black text-lg shrink-0">
                                    {fullName.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-base font-bold text-slate-900 dark:text-white truncate">{fullName}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.jobSeeker?.location || "Location not specified"}</p>
                                </div>
                            </div>

                            <div className="space-y-2 border-t border-stone-100 dark:border-slate-800 pt-3 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400 font-medium">Qualification:</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/40">
                                        {user?.jobSeeker?.qualification || "Not set"}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400 font-medium">WhatsApp Status:</span>
                                    <span className={`font-bold px-2 py-0.5 rounded-md ${user?.jobSeeker?.phone ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-stone-100 text-slate-500"}`}>
                                        {user?.jobSeeker?.phone ? "Connected" : "Unlinked"}
                                    </span>
                                </div>
                            </div>

                            <Link
                                href="/dashboard/seeker/profile"
                                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 py-2.5 text-xs font-bold text-slate-700 hover:bg-stone-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                            >
                                Edit Profile &amp; Qualifications →
                            </Link>
                        </div>
                    </SectionCard>

                    <SectionCard title="Refer a Friend">
                        <div className="space-y-4 p-6">
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                Get extra application priority credits for every friend who signs up and completes their profile using your invite link.
                            </p>
                            {user?.jobSeeker?.publicSlug && (
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/register?ref=${user.jobSeeker?.publicSlug}`);
                                        toast.success("Referral link copied to clipboard!");
                                    }}
                                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs font-bold text-slate-700 transition hover:bg-stone-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 active:scale-95"
                                >
                                    Copy Invite Link
                                    <Copy size={14} className="text-slate-400" />
                                </button>
                            )}
                        </div>
                    </SectionCard>

                    <SectionCard title="Saved jobs" action={savedJobs.length ? { label: "Open saved", href: "/dashboard/seeker/saved" } : undefined}>
                        <div className="space-y-3 p-6">
                            {savedJobs.length === 0 ? (
                                <p className="text-xs text-slate-500 dark:text-slate-400">No saved jobs yet.</p>
                            ) : (
                                savedJobs.slice(0, 4).map((saved) => (
                                    <div key={saved.id} className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                                        <button
                                            type="button"
                                            onClick={() => saved.job && setSelectedJob(saved.job as unknown as ExtendedJob)}
                                            className="w-full text-left hover:opacity-75 transition-opacity"
                                            disabled={!saved.job}
                                        >
                                            <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{saved.job?.title || "Job"}</p>
                                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{(saved.job?.employer as any)?.companyName || (saved.job?.employer as any)?.company_name || "Company"}</p>
                                        </button>
                                        <div className="mt-2 flex justify-end">
                                            {localAppliedJobIds.has(saved.job?.id || "") ? (
                                                <Badge label="Applied" variant="green" />
                                            ) : saved.job ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedJob(saved.job as unknown as ExtendedJob)}
                                                    className="text-xs font-semibold text-[#16324f] hover:underline dark:text-slate-200"
                                                >
                                                    Apply now →
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </SectionCard>
                </div>
            </div>

            {selectedJob && (
                <JobDetailModal
                    job={selectedJob}
                    isSaved={savedJobs.some((s) => s.job?.id === selectedJob.id)}
                    isApplied={localAppliedJobIds.has(selectedJob.id)}
                    onClose={() => setSelectedJob(null)}
                    onSave={() => toast.info("Manage your saved jobs in the Saved tab.")}
                    onApply={(answers) => handleApply(selectedJob.id, answers)}
                />
            )}
        </div>
    );
}
