import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import ApplicationsOverview from "@/components/dashboard/seeker/ApplicationsOverview";

export default async function ApplicationsPage() {
    // 1. Server-side Auth Check
    const auth = await validateAuth(["JOB_SEEKER"]);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        // 2. Data Fetching on the Server
        const { data: applications, error } = await supabase
            .from("applications")
            .select("*, job:jobs(*, employer(*))")
            .order("created_at", { ascending: false });

        if (error) throw error;

        return (
            <ApplicationsOverview applications={applications || []} />
        );
    } catch (error) {
        console.error("Seeker Applications Server Error:", error);
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <p className="text-slate-500">Failed to load applications. Please try refreshing.</p>
            </div>
        );
    }
}
