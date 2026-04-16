"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { User, Application, SavedJob } from "@/types";
import { useUser } from "@/context/UserContext";
import Link from "next/link";
import { Briefcase, BookmarkCheck, CheckCircle2, Loader2 } from "lucide-react";
import { PageHeader, StatCard, SectionCard, Badge } from "@/components/dashboard/ui";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export default function SeekerDashboardPage() {
    const { user } = useUser();
    const [applications, setApplications] = useState<Application[]>([]);
    const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
    const [loading, setLoading] = useState(true);
    const searchParams = useSearchParams();

    useEffect(() => {
        const payment = searchParams.get("payment");
        if (payment === "badge_success") toast.success("WorkBridge Badge Activated");
        else if (payment === "plus_success") toast.success("WorkBridge Plus Activated");
        else if (payment === "success") toast.success("Payment successful");
    }, [searchParams]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [appRes, savedRes] = await Promise.all([
                    apiFetch("/api/applications"),
                    apiFetch("/api/seeker/saved-jobs"),
                ]);
                if (appRes.ok) setApplications(await appRes.json());
                if (savedRes.ok) setSavedJobs(await savedRes.json());
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

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

                    <SectionCard title="Recent applications" action={applications.length ? { label: "View all", href: "/dashboard/seeker/applications" } : undefined}>
                        {applications.length === 0 ? (
                            <div className="px-6 py-16 text-center text-sm text-slate-500 dark:text-slate-400">You have not applied to any jobs yet.</div>
                        ) : (
                            <div className="divide-y divide-stone-200/70 dark:divide-slate-800">
                                {applications.slice(0, 5).map((app) => (
                                    <div key={app.id} className="flex items-center justify-between gap-4 px-6 py-4">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{app.job?.title || "Unknown role"}</p>
                                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{app.job?.employer?.companyName || app.job?.employer?.company_name || "Company"}</p>
                                        </div>
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

                    <SectionCard title="Saved jobs" action={savedJobs.length ? { label: "Open saved", href: "/dashboard/seeker/saved" } : undefined}>
                        <div className="space-y-3 p-6">
                            {savedJobs.length === 0 ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400">No saved jobs yet.</p>
                            ) : (
                                savedJobs.slice(0, 4).map((saved) => (
                                    <div key={saved.id} className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{saved.job?.title || "Job"}</p>
                                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{saved.job?.employer?.companyName || saved.job?.employer?.company_name || "Company"}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
}
