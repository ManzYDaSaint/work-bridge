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
    const [selectedJob, setSelectedJob] = useState<ExtendedJob | null>(null);

    const handleApply = async (jobId: string, screeningAnswers?: Record<string, ScreeningAnswer>) => {
        try {
            const res = await fetch(`/api/jobs/${jobId}/apply`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ screeningAnswers: screeningAnswers || {} }),
            });
            if (res.ok) {
                toast.success("Application sent.");
                window.location.reload(); 
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to apply");
            }
        } catch {
            toast.error("Failed to apply");
        }
    };

    const fullName = user?.jobSeeker?.full_name || user?.email?.split("@")[0] || "User";
    const isPremium = user?.plan === "PREMIUM" || user?.jobSeeker?.isSubscribed === true;
    
    // Use the new Profile Strength engine
    const strength = calculateProfileStrength(user?.jobSeeker);

    return (
        <div className="space-y-6 pb-20">
            <PageHeader title={`Hello, ${fullName}`} subtitle="Focus on three things: keep your profile ready, apply to good roles, and track responses." />

            {/* VIP Premium Active Hero Banner */}
            {isPremium ? (
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950 via-slate-900 to-emerald-950 border border-amber-500/30 p-6 sm:p-7 text-white shadow-xl">
                    <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3.5 py-1 text-xs font-extrabold text-amber-300 border border-amber-400/30 backdrop-blur">
                                <Crown size={14} className="text-amber-400 shrink-0" />
                                <span>AGANYU PREMIUM ACTIVE</span>
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                                Priority AI Job Matching &amp; Direct WhatsApp Alerts
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                                Your profile is actively prioritized for AI matching. Direct WhatsApp alerts will reach your phone as soon as new matching vacancies are posted.
                            </p>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                            <div className="flex items-center gap-2.5 rounded-2xl bg-white/10 border border-white/15 px-4 py-3 backdrop-blur text-xs font-semibold">
                                <MessageSquare size={16} className="text-emerald-400" />
                                <div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">WhatsApp Dispatch</p>
                                    <p className="text-white font-bold">{user?.jobSeeker?.phone || "Phone Linked"}</p>
                                </div>
                            </div>
                            <Link
                                href="/dashboard/seeker/subscription"
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 px-5 py-3 text-xs font-bold text-slate-950 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                            >
                                <Sparkles size={14} /> Subscription Details
                            </Link>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 border border-emerald-500/30 p-6 text-white shadow-lg">
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                                <Sparkles size={14} /> GET INSTANT WHATSAPP JOB ALERTS
                            </div>
                            <p className="text-sm font-semibold text-slate-200">
                                Never miss a job opening in Malawi. Get high-matching vacancies delivered straight to your WhatsApp.
                            </p>
                        </div>
                        <Link
                            href="/dashboard/seeker/subscription"
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-3 text-xs font-bold transition-all shadow-md shrink-0 active:scale-95"
                        >
                            Upgrade for MWK 1,000/mo
                        </Link>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Applications" value={applications.length} icon={Briefcase} iconBg="bg-stone-100 dark:bg-slate-800" iconColor="text-[#16324f]" />
                <StatCard label="Shortlisted" value={applications.filter((a) => a.status === "SHORTLISTED" || a.status === "INTERVIEWING" || a.status === "ACCEPTED").length} icon={CheckCircle2} iconBg="bg-emerald-50 dark:bg-emerald-950/30" iconColor="text-emerald-600" />
                <StatCard label="Saved jobs" value={savedJobs.length} icon={BookmarkCheck} iconBg="bg-amber-50 dark:bg-amber-950/30" iconColor="text-amber-600" />
            </div>

            <OnboardingChecklist user={user} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div className="space-y-6">
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
                    <SectionCard title="Profile">
                        <div className="space-y-2 p-6">
                            <p className="text-md font-semibold text-slate-900 dark:text-white">{fullName}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{user?.jobSeeker?.location || "Location not added"}</p>
                        </div>
                    </SectionCard>

                    <SectionCard title="Refer a Friend">
                        <div className="space-y-4 p-6">
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Get 5 extra application credits for every friend who signs up and completes their profile using your link.
                            </p>
                            {user?.jobSeeker?.publicSlug && (
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/register?ref=${user.jobSeeker?.publicSlug}`);
                                        toast.success("Referral link copied!");
                                    }}
                                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-stone-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                    Copy Invite Link
                                    <Copy size={16} className="text-slate-400" />
                                </button>
                            )}
                        </div>
                    </SectionCard>

                    <SectionCard title="Saved jobs" action={savedJobs.length ? { label: "Open saved", href: "/dashboard/seeker/saved" } : undefined}>
                        <div className="space-y-3 p-6">
                            {savedJobs.length === 0 ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400">No saved jobs yet.</p>
                            ) : (
                                savedJobs.slice(0, 4).map((saved) => (
                                    <div key={saved.id} className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                                        <button
                                            type="button"
                                            onClick={() => saved.job && setSelectedJob(saved.job as unknown as ExtendedJob)}
                                            className="w-full text-left hover:opacity-75 transition-opacity"
                                            disabled={!saved.job}
                                        >
                                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{saved.job?.title || "Job"}</p>
                                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{(saved.job?.employer as any)?.companyName || (saved.job?.employer as any)?.company_name || "Company"}</p>
                                        </button>
                                        <div className="mt-2 flex justify-end">
                                            {appliedJobIds.has(saved.job?.id || "") ? (
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
                    isApplied={appliedJobIds.has(selectedJob.id)}
                    onClose={() => setSelectedJob(null)}
                    onSave={() => toast.info("Manage your saved jobs in the Saved tab.")}
                    onApply={(answers) => handleApply(selectedJob.id, answers)}
                />
            )}
        </div>
    );
}
