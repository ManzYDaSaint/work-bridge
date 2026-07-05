import { redirect } from "next/navigation";
import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { fetchSeekerApplications, fetchSeekerSavedJobs } from "@/lib/seeker-data";
import SeekerOverview from "@/components/dashboard/seeker/SeekerOverview";
import SeekerPaymentToast from "@/components/dashboard/seeker/PaymentToast";

export default async function SeekerDashboardPage() {
    // 1. Server-side Auth Check
    const auth = await validateAuth(["JOB_SEEKER"]);
    if (auth.error) redirect("/login");

    const supabase = await createSupabaseServerClient();

    // 2. Parallel data fetching (employers fetched separately to avoid RLS join issues)
    const [appResult, savedResult] = await Promise.all([
        fetchSeekerApplications(supabase, auth.userId),
        fetchSeekerSavedJobs(supabase, auth.userId),
    ]);

    if (appResult.error || savedResult.error) {
        console.error(
            "Seeker Dashboard Server Error:",
            appResult.error?.message || savedResult.error?.message
        );
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <p className="text-slate-500">Failed to load dashboard. Please try refreshing.</p>
            </div>
        );
    }

    const applications = appResult.data;
    const savedJobs = savedResult.data;

    // Compute applied IDs for the client component
    const appliedJobIds = new Set(
        applications.map((a: any) => a.jobId || a.job?.id)
    );

    return (
        <>
            <SeekerPaymentToast />
            <SeekerOverview 
                user={auth.user} 
                applications={applications} 
                savedJobs={savedJobs} 
                appliedJobIds={appliedJobIds} 
            />
        </>
    );
}
