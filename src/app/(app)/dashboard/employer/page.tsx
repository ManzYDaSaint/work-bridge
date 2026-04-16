"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Briefcase, Users, ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import { PageHeader, StatCard, SectionCard, Badge } from "@/components/dashboard/ui";
import { useUser } from "@/context/UserContext";
import Link from "next/link";

export default function EmployerOverviewPage() {
    const { user } = useUser();
    const [stats, setStats] = useState({
        activeJobs: 0,
        totalApplicants: 0,
        shortlisted: 0,
        interviewsSet: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEmployerData = async () => {
            try {
                const res = await apiFetch("/api/employer/stats");

                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (err) {
                console.error("Failed to load employer dashboard:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchEmployerData();
    }, []);

    const isApproved = user?.employer?.status === "APPROVED";

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#16324f]" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            <PageHeader
                title="Employer overview"
                subtitle="Keep launch focused on posting roles, reviewing applicants, and making shortlist decisions."
            />

            {!isApproved && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                    Your company profile is still under review. You can browse the workspace, but posting and outreach stay locked until approval.
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Live roles" value={stats.activeJobs} icon={Briefcase} iconBg="bg-stone-100 dark:bg-slate-800" iconColor="text-[#16324f]" />
                <StatCard label="Applicants" value={stats.totalApplicants} icon={Users} iconBg="bg-emerald-50 dark:bg-emerald-950/30" iconColor="text-emerald-600" />
                <StatCard label="Shortlisted" value={stats.shortlisted} icon={CheckCircle} iconBg="bg-amber-50 dark:bg-amber-950/30" iconColor="text-amber-600" />
                <StatCard label="Interviews set" value={stats.interviewsSet} icon={ArrowRight} iconBg="bg-sky-50 dark:bg-sky-950/30" iconColor="text-sky-600" />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <SectionCard title="Hiring flow">
                    <div className="grid gap-3 p-5 sm:grid-cols-2">
                        <Link href="/dashboard/employer/jobs" className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 transition-colors hover:bg-white dark:border-slate-800 dark:bg-slate-900">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">Manage roles</p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Edit listings, close roles, and reopen expired posts.</p>
                        </Link>
                        <Link href="/dashboard/employer/candidates" className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 transition-colors hover:bg-white dark:border-slate-800 dark:bg-slate-900">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">Review candidates</p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">See the pipeline without switching through bulky screens.</p>
                        </Link>
                    </div>
                </SectionCard>

                <SectionCard title="Launch scope">
                    <div className="flex h-full flex-col justify-between gap-4 p-5">
                        <div>
                            <Badge label={isApproved ? "Ready to post" : "Pending approval"} variant={isApproved ? "green" : "yellow"} />
                            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                                This v1 keeps the employer side intentionally narrow: post jobs, review applicants, and keep company details current.
                            </p>
                        </div>
                        <Link href="/dashboard/employer/settings" className="inline-flex items-center gap-2 text-sm font-semibold text-[#16324f] hover:underline dark:text-slate-200">
                            Open company profile
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                </SectionCard>
            </div>
        </div>
    );
}
