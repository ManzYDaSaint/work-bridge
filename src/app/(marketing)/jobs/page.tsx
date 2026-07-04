import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import PublicJobBoard from "@/components/jobs/PublicJobBoard";
import { UserProvider } from "@/context/UserContext";
import { buildMeProfile } from "@/lib/me-profile";
import { getAuthOptional } from "@/lib/auth-guard";
import { jobService } from "@/services/jobService";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Browse Jobs in Malawi — Remote, Hybrid & On-site Roles | Aganyu",
    description:
        "Search hundreds of remote, hybrid, and on-site jobs in Malawi. Filter by role type, work mode, and location. Apply in seconds — no account needed to browse.",
    alternates: { canonical: "/jobs" },
    openGraph: {
        title: "Browse Jobs in Malawi | Aganyu",
        description: "Explore remote, hybrid, and on-site roles from trusted Malawian employers.",
        url: "/jobs",
        type: "website",
    },
};

function JobsFallback() {
    return (
        <div className="max-w-3xl mx-auto px-4 py-16 space-y-6 animate-pulse">
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-48" />
            <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-64 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800" />
        </div>
    );
}

export default async function JobsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;
    const page = parseInt(params.page as string) || 1;
    const query = params.query as string || "";
    const workMode = params.workMode as string || "ALL";
    const type = params.type as string || "ALL";
    const limit = 20;

    const supabase = await createSupabaseServerClient();
    const auth = await getAuthOptional();
    const user = auth.user;

    const { profile } = user
        ? await buildMeProfile(supabase, user.id)
        : { profile: null };

    if (profile?.role === "JOB_SEEKER") {
        redirect("/dashboard/seeker/jobs");
    }

    // 1. Parallel Data Fetching
    const [jobsResponse, savedQuery, appsQuery] = await Promise.all([
        jobService.getJobs({
            page,
            limit,
            query: query || undefined,
            workMode,
            type
        }),
        user ? supabase.from("saved_jobs").select("job_id") : Promise.resolve({ data: [] }),
        user ? supabase.from("applications").select("jobId") : Promise.resolve({ data: [] }),
    ]);

    const savedJobIds = new Set((savedQuery.data || []).map((s: any) => s.job_id));
    const appliedJobIds = new Set((appsQuery.data || []).map((a: any) => a.jobId));

    return (
        <Suspense fallback={<JobsFallback />}>
            <UserProvider initialUser={profile}>
                <div className="pb-20">
                    <section className="px-4 sm:px-6 max-w-6xl mx-auto pt-16 sm:pt-20 pb-10">
                        <div className="overflow-hidden rounded-[2rem] border border-stone-200/80 bg-white/90 px-6 py-8 shadow-[0_30px_90px_-50px_rgba(17,24,39,0.22)] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/80 sm:px-10 sm:py-12">
                            <p className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-400">
                                Browse jobs
                            </p>
                            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                                Browse Jobs in Malawi — Remote, Hybrid &amp; On-site Roles
                            </h1>
                            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
                                Discover remote, hybrid, and on-site roles from trusted employers. This board is styled for the landing page while the in-platform job board stays unchanged.
                            </p>
                            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                                <a
                                    href="/register?role=seeker"
                                    className="inline-flex items-center justify-center rounded-2xl bg-[#16324f] px-6 py-3 text-base font-semibold text-white transition hover:opacity-90"
                                >
                                    Create a free profile
                                </a>
                                <a
                                    href="/login"
                                    className="inline-flex items-center justify-center rounded-2xl border border-stone-200 bg-white px-6 py-3 text-base font-semibold text-slate-900 transition hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                                >
                                    Sign in to save jobs
                                </a>
                                <a
                                    href="#job-board"
                                    className="inline-flex items-center justify-center rounded-2xl px-6 py-3 text-base font-semibold text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                                >
                                    Jump to job listings
                                </a>
                            </div>
                        </div>
                    </section>

                    <section id="job-board" className="px-4 sm:px-6 max-w-6xl mx-auto">
                        <div className="rounded-[2rem] border border-stone-200 bg-stone-50 p-6 shadow-[0_24px_80px_-50px_rgba(17,24,39,0.18)] dark:border-slate-800 dark:bg-slate-900/80">
                            <PublicJobBoard 
                                initialJobs={jobsResponse.jobs}
                                initialTotalPages={jobsResponse.totalPages}
                                initialSavedJobIds={savedJobIds}
                                initialAppliedJobIds={appliedJobIds}
                                currentPage={page}
                                currentQuery={query}
                                currentWorkMode={workMode}
                                currentType={type}
                            />
                        </div>
                    </section>
                </div>
            </UserProvider>
        </Suspense>
    );
}
