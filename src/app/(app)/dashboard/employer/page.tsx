import { Briefcase, Users, ArrowRight, CheckCircle, PlusCircle, UserCheck, Building2 } from "lucide-react";
import { PageHeader, StatCard, Badge } from "@/components/dashboard/ui";
import Link from "next/link";
import OnboardingChecklist from "@/components/dashboard/OnboardingChecklist";
import { requireDashboardProfile } from "@/lib/dashboard-auth";
import { EmployerService } from "@/services/employer.service";

export default async function EmployerOverviewPage() {
    const { profile: user } = await requireDashboardProfile("EMPLOYER");
    const stats = await EmployerService.getEmployerStats(user.id);

    const isApproved = user.employer?.status === "APPROVED";

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Employer Overview"
                subtitle="Manage active roles, review applicants, and streamline candidate shortlisting."
                action={
                    isApproved
                        ? { label: "Post New Role", icon: PlusCircle, href: "/dashboard/employer/jobs/new" }
                        : undefined
                }
            />

            {!isApproved && (
                <div className="rounded-3xl border border-amber-200/80 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
                    <strong>Notice:</strong> Your company profile is currently under review by the Aganyu team. Posting new roles is locked until verification is completed.
                </div>
            )}

            {/* Micro-Metrics Row */}
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <Link href="/dashboard/employer/jobs?status=ACTIVE" className="block transition-transform hover:-translate-y-0.5">
                    <StatCard label="Live Roles" value={stats.activeJobs} icon={Briefcase} iconBg="bg-stone-100 dark:bg-slate-800" iconColor="text-[#16324f] dark:text-amber-400" />
                </Link>
                <Link href="/dashboard/employer/candidates" className="block transition-transform hover:-translate-y-0.5">
                    <StatCard label="Applicants" value={stats.totalApplicants} icon={Users} iconBg="bg-emerald-50 dark:bg-emerald-950/40" iconColor="text-emerald-600 dark:text-emerald-400" />
                </Link>
                <Link href="/dashboard/employer/candidates?status=SHORTLISTED" className="block transition-transform hover:-translate-y-0.5">
                    <StatCard label="Shortlisted" value={stats.shortlisted} icon={CheckCircle} iconBg="bg-amber-50 dark:bg-amber-950/40" iconColor="text-amber-600 dark:text-amber-400" />
                </Link>
                <Link href="/dashboard/employer/candidates?status=INTERVIEWING" className="block transition-transform hover:-translate-y-0.5">
                    <StatCard label="Interviews Set" value={stats.interviewsSet} icon={ArrowRight} iconBg="bg-sky-50 dark:bg-sky-950/40" iconColor="text-sky-600 dark:text-sky-400" />
                </Link>
            </div>

            {/* Quick Action Grid */}
            <div className="rounded-3xl border border-stone-200/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3.5 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {isApproved ? "Priority Actions" : "Before You Hire"}
                    </h3>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                    {isApproved ? (
                        <>
                            <Link
                                href="/dashboard/employer/jobs/new"
                                className="group flex flex-col justify-between rounded-2xl border border-stone-200/80 bg-stone-50/50 p-4 transition-all hover:border-stone-300 hover:bg-white dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-slate-700"
                            >
                                <div className="space-y-1">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                                        <PlusCircle size={18} />
                                    </div>
                                    <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#16324f] dark:group-hover:text-amber-400 transition-colors">Post a New Role</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Start a fresh hiring campaign with custom screening questions.</p>
                                </div>
                            </Link>

                            <Link
                                href="/dashboard/employer/candidates"
                                className="group flex flex-col justify-between rounded-2xl border border-stone-200/80 bg-stone-50/50 p-4 transition-all hover:border-stone-300 hover:bg-white dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-slate-700"
                            >
                                <div className="space-y-1">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                                        <UserCheck size={18} />
                                    </div>
                                    <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#16324f] dark:group-hover:text-amber-400 transition-colors">Review Applicants</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Evaluate candidate scores and move qualified talent forward.</p>
                                </div>
                            </Link>

                            <Link
                                href="/dashboard/employer/settings"
                                className="group flex flex-col justify-between rounded-2xl border border-stone-200/80 bg-stone-50/50 p-4 transition-all hover:border-stone-300 hover:bg-white dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-slate-700"
                            >
                                <div className="space-y-1">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400">
                                        <Building2 size={18} />
                                    </div>
                                    <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#16324f] dark:group-hover:text-amber-400 transition-colors">Company Profile</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Keep your company logo, description, and contact info current.</p>
                                </div>
                            </Link>
                        </>
                    ) : (
                        <>
                            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                                <p className="text-xs font-bold text-amber-900 dark:text-amber-300">1. Complete Profile</p>
                                <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-300/80 leading-relaxed">Fill out business location and registration details for review.</p>
                            </div>
                            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                                <p className="text-xs font-bold text-amber-900 dark:text-amber-300">2. Verification</p>
                                <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-300/80 leading-relaxed">Our team will verify your recruiter status within 24 hours.</p>
                            </div>
                            <Link href="/dashboard/employer/settings" className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4 transition-colors hover:bg-white dark:border-slate-800 dark:bg-slate-800/40">
                                <p className="text-xs font-bold text-slate-900 dark:text-white">3. Settings</p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Update settings to speed up your profile review.</p>
                            </Link>
                        </>
                    )}
                </div>
            </div>

            <OnboardingChecklist user={user} />

            {/* Hiring Flow & Status Grid */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-stone-200/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-stone-100 pb-3 dark:border-slate-800">
                        Hiring Flow Shortcuts
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Link href="/dashboard/employer/jobs" className="rounded-2xl border border-stone-200/80 bg-stone-50/50 p-4 transition-all hover:bg-stone-100 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">Manage Listings</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Edit active posts, close roles, and reopen expired vacancies.</p>
                        </Link>
                        <Link href="/dashboard/employer/candidates" className="rounded-2xl border border-stone-200/80 bg-stone-50/50 p-4 transition-all hover:bg-stone-100 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">Review Pipeline</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">View scorecards and schedule interviews with top applicants.</p>
                        </Link>
                    </div>
                </div>

                <div className="rounded-3xl border border-stone-200/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-stone-100 pb-3 dark:border-slate-800">
                        Account Status
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Badge label={isApproved ? "VERIFIED EMPLOYER" : "PENDING APPROVAL"} variant={isApproved ? "green" : "yellow"} />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            Aganyu workspace keeps hiring simple: post jobs, review AI-scored candidate profiles, and contact talent directly.
                        </p>
                    </div>
                    <Link href="/dashboard/employer/settings" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16324f] hover:underline dark:text-amber-400">
                        Edit Company Settings <ArrowRight size={14} />
                    </Link>
                </div>
            </div>
        </div>
    );
}
