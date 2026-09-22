"use client";

import { useState } from "react";
import Link from "next/link";
import { 
    Briefcase, BookmarkCheck, CheckCircle2, Copy, AlertCircle, Crown, 
    Sparkles, Target, ArrowRight, TrendingUp, 
    ShieldCheck, ChevronRight, Zap
} from "lucide-react";
import { SectionCard, Badge } from "@/components/dashboard/ui";
import JobAlertsManager from "@/components/dashboard/seeker/JobAlertsManager";
import ProfileAnalyticsCard from "@/components/dashboard/seeker/ProfileAnalyticsCard";
import { toast } from "sonner";
import OnboardingChecklist from "@/components/dashboard/OnboardingChecklist";
import JobDetailModal, { ExtendedJob } from "@/components/jobs/JobDetailModal";
import { ScreeningAnswer, Application, SavedJob } from "@/types";
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
    const [activeTab, setActiveTab] = useState<"FEED" | "APPLICATIONS" | "SAVED" | "GROWTH">("FEED");

    const handleApply = async (jobId: string, screeningAnswers?: Record<string, ScreeningAnswer>) => {
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

    const seeker = activeUser?.jobSeeker;
    const fullName = seeker?.full_name || activeUser?.email?.split("@")[0] || "User";
    const isPremium = activeUser?.plan === "PREMIUM" || seeker?.isSubscribed === true;

    // Profile strength calculation
    const strength = calculateProfileStrength(seeker);
    const nextActions = [
        !seeker?.full_name ? { title: "Add your full name", detail: "Personalise your professional profile.", href: "/dashboard/seeker/profile" } : null,
        !seeker?.qualification ? { title: "Add highest qualification", detail: "Highlight your highest level of education.", href: "/dashboard/seeker/profile" } : null,
        !seeker?.phone ? { title: "Connect WhatsApp", detail: "Get instant alerts and faster responses.", href: "/dashboard/seeker/profile" } : null,
        !seeker?.skills?.length ? { title: "Add your skills", detail: "Improve discovery and match quality.", href: "/dashboard/seeker/profile" } : null,
        !(seeker?.experience?.length) ? { title: "Add work experience", detail: "Show employers the value you bring.", href: "/dashboard/seeker/profile" } : null,
    ].filter(Boolean) as Array<{ title: string; detail: string; href: string }>;

    const primaryEdu = Array.isArray(seeker?.education) && seeker.education.length > 0 ? (seeker.education[0] as any) : null;
    const specificQualification = (primaryEdu?.certificate || primaryEdu?.degree || primaryEdu?.qualification || "").trim();
    const displayQualification = specificQualification || seeker?.qualification || "Not set";

    const shortlistedApps = applications.filter((a) => a.status === "SHORTLISTED" || a.status === "INTERVIEWING" || a.status === "ACCEPTED");

    return (
        <div className="space-y-5 pb-24">
            {/* 1. Sleek Top Hero Header Card (Responsive) */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#16324f] via-[#1a3d61] to-[#0f243b] p-5 sm:p-6 text-white shadow-md">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
                <div className="absolute right-20 -bottom-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
                
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between relative z-10">
                    <div className="flex items-start gap-3.5 min-w-0">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300 font-black text-lg border border-amber-500/30 shadow-inner">
                            {fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white truncate">
                                    Hello, {fullName}
                                </h1>
                                {isPremium && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300 border border-amber-400/30">
                                        <Crown size={11} className="text-amber-400" /> Premium
                                    </span>
                                )}
                            </div>
                            <p className="mt-0.5 text-xs text-slate-300 truncate">
                                {seeker?.headline || seeker?.location || "Welcome back to your job hub"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t border-slate-700/60 sm:border-t-0">
                        <Link
                            href="/dashboard/seeker/subscription"
                            className={`flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-sm ${
                                isPremium 
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-400/40 hover:bg-amber-500/30" 
                                    : "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:brightness-110 active:scale-95"
                            }`}
                        >
                            {isPremium ? (
                                <>
                                    <ShieldCheck size={14} className="text-amber-400" /> Active Membership
                                </>
                            ) : (
                                <>
                                    <Sparkles size={14} /> Upgrade (MWK 1,000)
                                </>
                            )}
                        </Link>

                        <Link
                            href="/dashboard/seeker/profile"
                            className="flex items-center justify-center rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-white/20 transition active:scale-95"
                        >
                            Edit Profile
                        </Link>
                    </div>
                </div>

                {/* WhatsApp & Profile Health Micro-strip inside Hero */}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-4 border-t border-white/10 text-xs">
                    <div className="flex items-center justify-between rounded-2xl bg-white/5 px-3.5 py-2 backdrop-blur border border-white/10">
                        <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${seeker?.phone ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-amber-400"}`} />
                            <span className="text-slate-200 text-[11px] font-medium">WhatsApp Alerts</span>
                        </div>
                        <span className="font-bold text-white text-[11px]">
                            {seeker?.phone ? "Connected" : "Not Linked"}
                        </span>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-white/5 px-3.5 py-2 backdrop-blur border border-white/10">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={13} className="text-emerald-400" />
                            <span className="text-slate-200 text-[11px] font-medium">Profile Strength</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-700">
                                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${strength.percentage}%` }} />
                            </div>
                            <span className="font-bold text-emerald-300 text-[11px]">{strength.percentage}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Compact High-Impact Stat Strip (Swipeable/Responsive Grid) */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                <button
                    onClick={() => setActiveTab("APPLICATIONS")}
                    className={`flex flex-col items-start p-3 sm:p-4 rounded-2xl border text-left transition-all ${
                        activeTab === "APPLICATIONS" 
                            ? "border-[#16324f] bg-slate-900 text-white shadow-sm dark:bg-slate-800" 
                            : "border-stone-200/90 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                    }`}
                >
                    <div className="flex items-center justify-between w-full">
                        <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">Apps</span>
                        <Briefcase size={15} className="text-[#16324f] dark:text-slate-300" />
                    </div>
                    <span className="text-lg sm:text-2xl font-black mt-1 text-slate-900 dark:text-white">{applications.length}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 hidden sm:inline">Total Submitted</span>
                </button>

                <button
                    onClick={() => setActiveTab("APPLICATIONS")}
                    className={`flex flex-col items-start p-3 sm:p-4 rounded-2xl border text-left transition-all ${
                        activeTab === "APPLICATIONS" 
                            ? "border-emerald-500 bg-emerald-950/20 dark:bg-emerald-950/40" 
                            : "border-emerald-200/80 bg-emerald-50/50 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                    }`}
                >
                    <div className="flex items-center justify-between w-full">
                        <span className="text-[11px] sm:text-xs font-semibold text-emerald-700 dark:text-emerald-300">Shortlisted</span>
                        <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-lg sm:text-2xl font-black mt-1 text-emerald-900 dark:text-emerald-100">{shortlistedApps.length}</span>
                    <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400 mt-0.5 hidden sm:inline">Interview / Accepted</span>
                </button>

                <button
                    onClick={() => setActiveTab("SAVED")}
                    className={`flex flex-col items-start p-3 sm:p-4 rounded-2xl border text-left transition-all ${
                        activeTab === "SAVED" 
                            ? "border-amber-500 bg-amber-950/20 dark:bg-amber-950/40" 
                            : "border-amber-200/80 bg-amber-50/50 hover:bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20"
                    }`}
                >
                    <div className="flex items-center justify-between w-full">
                        <span className="text-[11px] sm:text-xs font-semibold text-amber-700 dark:text-amber-300">Saved</span>
                        <BookmarkCheck size={15} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="text-lg sm:text-2xl font-black mt-1 text-amber-900 dark:text-amber-100">{savedJobs.length}</span>
                    <span className="text-[10px] text-amber-600/80 dark:text-amber-400 mt-0.5 hidden sm:inline">Bookmarked Roles</span>
                </button>
            </div>

            {/* 3. Segmented Navigation Control Bar (Eliminates Cloudiness & Clutter) */}
            <div className="flex items-center justify-between gap-1 overflow-x-auto rounded-2xl border border-stone-200/80 bg-stone-100/70 p-1 dark:border-slate-800 dark:bg-slate-900/80 scrollbar-none">
                {[
                    { id: "FEED", label: "Matches & Feed", icon: Zap },
                    { id: "APPLICATIONS", label: "Applications", icon: Briefcase },
                    { id: "SAVED", label: "Saved Roles", icon: BookmarkCheck },
                    { id: "GROWTH", label: "Profile & Growth", icon: Target },
                ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                                isActive
                                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                            }`}
                        >
                            <Icon size={14} className={isActive ? "text-[#16324f] dark:text-amber-400" : "opacity-70"} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* 4. Tab Contents - Focused Views */}
            {activeTab === "FEED" && (
                <div className="space-y-5">
                    {/* Onboarding checklist widget */}
                    <OnboardingChecklist user={user} />

                    {/* Recommended matches spotlight card */}
                    <SectionCard 
                        title="Recommended Job Matches" 
                        action={{ label: "Explore all matches →", href: "/dashboard/seeker/recommendations" }}
                    >
                        <div className="space-y-4 p-5">
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                Personalized opportunities updated automatically based on your highest qualification (<span className="font-bold text-slate-800 dark:text-slate-200">{displayQualification}</span>) and registered skills.
                            </p>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:bg-amber-500/30 dark:text-amber-400">
                                        <Sparkles size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-amber-950 dark:text-amber-200">
                                            Smart Career Match Radar Active
                                        </p>
                                        <p className="text-[11px] text-amber-800/80 dark:text-amber-400">
                                            Match scores prioritize roles matching your qualifications and location.
                                        </p>
                                    </div>
                                </div>
                                <Link
                                    href="/dashboard/seeker/recommendations"
                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#16324f] px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 active:scale-95 shrink-0"
                                >
                                    Open Recommendations
                                    <ChevronRight size={14} />
                                </Link>
                            </div>
                        </div>
                    </SectionCard>

                    {/* Next Actions checklist if incomplete */}
                    {nextActions.length > 0 && (
                        <SectionCard title="Recommended Next Actions">
                            <div className="divide-y divide-stone-100 dark:divide-slate-800">
                                {nextActions.map((action) => (
                                    <Link
                                        key={action.title}
                                        href={action.href}
                                        className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-stone-50 dark:hover:bg-slate-900/60"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                                                <AlertCircle size={15} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{action.title}</p>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{action.detail}</p>
                                            </div>
                                        </div>
                                        <ArrowRight size={14} className="text-slate-400 shrink-0" />
                                    </Link>
                                ))}
                            </div>
                        </SectionCard>
                    )}
                </div>
            )}

            {activeTab === "APPLICATIONS" && (
                <div className="space-y-5">
                    <SectionCard title="Application Activity Tracker" action={{ label: "View full history", href: "/dashboard/seeker/applications" }}>
                        {applications.length === 0 ? (
                            <div className="px-6 py-12 text-center text-xs text-slate-500 dark:text-slate-400">
                                You haven&apos;t submitted any applications yet. Explore recommended matches to start!
                            </div>
                        ) : (
                            <div className="divide-y divide-stone-100 dark:divide-slate-800">
                                {applications.slice(0, 8).map((app) => (
                                    <div key={app.id} className="flex items-center justify-between gap-3 p-4 hover:bg-stone-50/70 dark:hover:bg-slate-900/40 transition">
                                        <button
                                            type="button"
                                            onClick={() => app.job && setSelectedJob(app.job as unknown as ExtendedJob)}
                                            className="min-w-0 text-left hover:opacity-75 transition"
                                            disabled={!app.job}
                                        >
                                            <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{app.job?.title || "Role Title"}</p>
                                            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                                {(app.job?.employer as any)?.companyName || (app.job?.employer as any)?.company_name || "Company"}{app.createdAt ? ` • Applied ${new Date(app.createdAt).toLocaleDateString()}` : ""}
                                            </p>
                                        </button>
                                        <Badge 
                                            label={app.status} 
                                            variant={app.status === "ACCEPTED" || app.status === "SHORTLISTED" ? "green" : app.status === "REJECTED" ? "red" : "yellow"} 
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </SectionCard>
                </div>
            )}

            {activeTab === "SAVED" && (
                <div className="space-y-5">
                    <SectionCard title="Saved Bookmarks" action={{ label: "Open saved list", href: "/dashboard/seeker/saved" }}>
                        <div className="space-y-3 p-4">
                            {savedJobs.length === 0 ? (
                                <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">No saved jobs bookmarked yet.</p>
                            ) : (
                                savedJobs.map((saved) => (
                                    <div key={saved.id} className="rounded-2xl border border-stone-200/80 bg-stone-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-900/60 flex items-center justify-between gap-3">
                                        <button
                                            type="button"
                                            onClick={() => saved.job && setSelectedJob(saved.job as unknown as ExtendedJob)}
                                            className="min-w-0 text-left hover:opacity-75 transition"
                                            disabled={!saved.job}
                                        >
                                            <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{saved.job?.title || "Job Title"}</p>
                                            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                                {(saved.job?.employer as any)?.companyName || (saved.job?.employer as any)?.company_name || "Company"}
                                            </p>
                                        </button>

                                        <div className="shrink-0">
                                            {localAppliedJobIds.has(saved.job?.id || "") ? (
                                                <Badge label="Applied" variant="green" />
                                            ) : saved.job ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedJob(saved.job as unknown as ExtendedJob)}
                                                    className="inline-flex items-center gap-1 text-xs font-bold text-[#16324f] hover:underline dark:text-amber-400"
                                                >
                                                    Apply →
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </SectionCard>
                </div>
            )}

            {activeTab === "GROWTH" && (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {/* Profile Readiness & Analytics */}
                    <SectionCard title="Profile Readiness">
                        <div className="space-y-5 p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white">Profile Strength</p>
                                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                        {strength.isComplete 
                                            ? "Your profile is fully optimized for top employer search placement!" 
                                            : "Complete missing details to gain maximum visibility."}
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

                            <Link href="/dashboard/seeker/profile" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16324f] hover:underline dark:text-amber-400">
                                Manage Profile Details & Qualifications →
                            </Link>
                        </div>
                    </SectionCard>

                    <ProfileAnalyticsCard />

                    <JobAlertsManager />

                    {/* Refer a friend card */}
                    <SectionCard title="Invite & Earn Application Priority">
                        <div className="space-y-3 p-5">
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                Share Aganyu with fellow job seekers. Boost your application ranking when peers complete their profile using your link.
                            </p>
                            {seeker?.publicSlug && (
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/register?ref=${seeker.publicSlug}`);
                                        toast.success("Invite link copied!");
                                    }}
                                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-stone-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition active:scale-95"
                                >
                                    <span>Copy Referral Link</span>
                                    <Copy size={14} className="text-slate-400" />
                                </button>
                            )}
                        </div>
                    </SectionCard>
                </div>
            )}

            {/* Job detail modal */}
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
