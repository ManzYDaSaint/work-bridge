import { redirect } from "next/navigation";
import { Suspense } from "react";
import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import PublicJobBoard from "@/components/jobs/PublicJobBoard";
import { jobService } from "@/services/jobService";

export const dynamic = "force-dynamic";

function JobsFallback() {
    return (
        <div className="max-w-3xl mx-auto px-4 py-16 space-y-6 animate-pulse">
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-48" />
            <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-64 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800" />
        </div>
    );
}

export default async function SeekerJobsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    // 1. Auth Check
    const auth = await validateAuth(["JOB_SEEKER"]);
    if (auth.error) redirect("/login");

    const params = await searchParams;
    const page = parseInt(params.page as string) || 1;
    const query = params.query as string || "";
    const workMode = params.workMode as string || "ALL";
    const type = params.type as string || "ALL";
    const limit = 20;

    const supabase = await createSupabaseServerClient();

    // 2. Parallel Data Fetching
    const [jobsResponse, savedQuery, appsQuery] = await Promise.all([
        // Jobs fetch with filters via cached service
        jobService.getJobs({
            page,
            limit,
            query: query || undefined,
            workMode,
            type
        }),
        // Saved jobs
        supabase
            .from("saved_jobs")
            .select("job_id"),
        // Applications
        supabase
            .from("applications")
            .select("jobId"),
    ]);

    if (savedQuery.error || appsQuery.error) {
        console.error("Jobs Server Error:", savedQuery.error || appsQuery.error);
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <p className="text-slate-500">Failed to load jobs. Please try refreshing.</p>
            </div>
        );
    }

    const savedJobIds = new Set((savedQuery.data || []).map((s: any) => s.job_id));
    const appliedJobIds = new Set((appsQuery.data || []).map((a: any) => a.jobId));

    return (
        <Suspense fallback={<JobsFallback />}>
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
        </Suspense>
    );
}
