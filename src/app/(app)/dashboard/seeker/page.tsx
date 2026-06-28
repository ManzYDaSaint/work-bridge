"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Application, SavedJob } from "@/types";
import { useUser } from "@/context/UserContext";
import Link from "next/link";
import { Briefcase, BookmarkCheck, CheckCircle2, Copy, Loader2 } from "lucide-react";
import { PageHeader, StatCard, SectionCard, Badge } from "@/components/dashboard/ui";
import JobAlertsManager from "@/components/dashboard/seeker/JobAlertsManager";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import OnboardingChecklist from "@/components/dashboard/OnboardingChecklist";
import JobDetailModal, { ExtendedJob } from "@/components/jobs/JobDetailModal";
import { ScreeningAnswer } from "@/types";

export default function SeekerDashboardPage() {
    const { user } = useUser();
    const [applications, setApplications] = useState<Application[]>([]);
    const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState<ExtendedJob | null>(null);
    const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
    const searchParams = useSearchParams();

    useEffect(() => {
        const payment = searchParams.get("payment");
        if (payment === "badge_success") toast.success("Aganyu Badge Activated");
        else if (payment === "plus_success") toast.success("Aganyu Plus Activated");
        else if (payment === "success") toast.success("Payment successful");
    }, [searchParams]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [appRes, savedRes] = await Promise.all([
                    apiFetch("/api/applications"),
                    apiFetch("/api/seeker/saved-jobs"),
                ]);
                if (appRes.ok) {
                    const apps = await appRes.json();
                    setApplications(apps);
                    setAppliedJobIds(new Set(apps.map((a: any) => a.jobId || (a.job && a.job.id))));
                }
                if (savedRes.ok) setSavedJobs(await savedRes.json());
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleApply = async (jobId: string, screeningAnswers?: Record<string, ScreeningAnswer>) => {
        try {
            const res = await apiFetch(`/api/jobs/${jobId}/apply`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ screeningAnswers: screeningAnswers || {} }),
            });
            if (res.ok) {
                setAppliedJobIds((prev) => new Set([...prev, jobId]));
                toast.success("Application sent.");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to apply");
            }
        } catch {
            toast.error("Failed to apply");
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#16324f]" />
            </div>
        );
    }

    const fullName = user?.jobSeeker?.full_name || user?.email?.split("@")[0] || "User";
    const profileCompletion = user?.jobSeeker?.completion ?? 0;

    return (
        <div className="space-y-6 pb-20">
            <PageHeader title={`Hello, ${fullName}`} subtitle="Focus on three things: keep your profile ready, apply to good roles, and track responses." />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Applications" value={applications.length} icon={Briefcase} iconBg="bg-stone-100 dark:bg-slate-800" iconColor="text-[#16324f]" />
                <StatCard label="Shortlisted" value={applications.filter((a) => a.status === "SHORTLISTED" || a.status === "INTERVIEWING" || a.status === "ACCEPTED").length} icon={CheckCircle2} iconBg="bg-emerald-50 dark:bg-emerald-950/30" iconColor="text-emerald-600" />
                <StatCard label="Saved jobs" value={savedJobs.length} icon={BookmarkCheck} iconBg="bg-amber-50 dark:bg-amber-950/30" iconColor="text-amber-600" />
            </div>

            <OnboardingChecklist user={user} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div className="space-y-6">
                    <SectionCard title="Profile readiness">
                        <div className="space-y-4 p-6">
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Keep your profile complete so employers can quickly understand your background and contact you with confidence.
                            </p>
                            <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Profile completion</p>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        Resume, skills, experience, and location all help your applications move faster.
                                    </p>
                                </div>
                                <Badge label={`${profileCompletion}%`} variant={profileCompletion >= 80 ? "green" : "yellow"} />
                            </div>
                            <Link href="/dashboard/seeker/profile" className="inline-flex items-center gap-2 text-sm font-semibold text-[#16324f] hover:underline dark:text-slate-200">
                                Complete profile
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
