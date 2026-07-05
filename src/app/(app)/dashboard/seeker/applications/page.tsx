import { redirect } from "next/navigation";
import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { fetchSeekerApplications } from "@/lib/seeker-data";
import ApplicationsOverview from "@/components/dashboard/seeker/ApplicationsOverview";
import type { ExtendedJob } from "@/components/jobs/JobDetailModal";

export default async function ApplicationsPage() {
    const auth = await validateAuth(["JOB_SEEKER"]);
    if (auth.error) redirect("/login");

    const supabase = await createSupabaseServerClient();
    const { data: applications, error } = await fetchSeekerApplications(supabase, auth.userId);

    if (error) {
        console.error("Seeker Applications Server Error:", error.message);
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <p className="text-slate-500">Failed to load applications. Please try refreshing.</p>
            </div>
        );
    }

    return <ApplicationsOverview applications={applications.map((app) => ({
        id: app.id,
        jobId: app.jobId,
        status: app.status,
        createdAt: app.createdAt ?? "",
        viewedAt: app.viewedAt,
        job: (app.job ?? null) as ExtendedJob | null,
    }))} />;
}
