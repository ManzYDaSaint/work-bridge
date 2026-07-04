import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import SavedJobsOverview from "@/components/dashboard/seeker/SavedJobsOverview";

export default async function SavedJobsPage() {
    // 1. Server-side Auth Check
    const auth = await validateAuth(["JOB_SEEKER"]);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    // 2. Parallel Data Fetching on the Server
    const [savedData, appsData] = await Promise.all([
        supabase
            .from("saved_jobs")
            .select("*, job:jobs(*, employer(*))")
            .order("created_at", { ascending: false }),
        supabase
            .from("applications")
            .select("jobId")
    ]);

    if (savedData.error || appsData.error) {
        console.error("Seeker Saved Jobs Server Error:", savedData.error || appsData.error);
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <p className="text-slate-500">Failed to load saved jobs. Please try refreshing.</p>
            </div>
        );
    }

    const savedEntries = savedData.data || [];
    const applications = appsData.data || [];

    const appliedJobIds = new Set(
        applications.map((a: any) => a.jobId)
    );

    return (
        <SavedJobsOverview 
            savedEntries={savedEntries} 
            appliedJobIds={appliedJobIds} 
        />
    );
}
