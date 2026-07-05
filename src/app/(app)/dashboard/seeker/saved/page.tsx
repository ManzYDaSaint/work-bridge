import { redirect } from "next/navigation";
import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { fetchSeekerApplications, fetchSeekerSavedJobs } from "@/lib/seeker-data";
import SavedJobsOverview from "@/components/dashboard/seeker/SavedJobsOverview";

export default async function SavedJobsPage() {
    const auth = await validateAuth(["JOB_SEEKER"]);
    if (auth.error) redirect("/login");

    const supabase = await createSupabaseServerClient();

    const [savedResult, appResult] = await Promise.all([
        fetchSeekerSavedJobs(supabase, auth.userId),
        fetchSeekerApplications(supabase, auth.userId),
    ]);

    if (savedResult.error || appResult.error) {
        console.error(
            "Seeker Saved Jobs Server Error:",
            savedResult.error?.message || appResult.error?.message
        );
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <p className="text-slate-500">Failed to load saved jobs. Please try refreshing.</p>
            </div>
        );
    }

    const appliedJobIds = new Set(appResult.data.map((a) => a.jobId));

    return (
        <SavedJobsOverview
            savedEntries={savedResult.data}
            appliedJobIds={appliedJobIds}
        />
    );
}
