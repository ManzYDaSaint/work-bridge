import { redirect } from "next/navigation";
import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import SeekerOverview from "@/components/dashboard/seeker/SeekerOverview";
import SeekerPaymentToast from "@/components/dashboard/seeker/PaymentToast";
// types removed: Application, SavedJob (not used here)

export default async function SeekerDashboardPage() {
    // 1. Server-side Auth Check
    const auth = await validateAuth(["JOB_SEEKER"]);
    if (auth.error) redirect("/login");

    const supabase = await createSupabaseServerClient();

    // 2. Parallel Data Fetching on the Server
    const [appData, savedData] = await Promise.all([
        supabase
            .from("applications")
            .select("*, job:jobs(*, employer(*))")
            .order("created_at", { ascending: false }),
        supabase
            .from("saved_jobs")
            .select("*, job:jobs(*, employer(*))")
            .order("created_at", { ascending: false }),
    ]);

    if (appData.error || savedData.error) {
        console.error("Seeker Dashboard Server Error:", appData.error || savedData.error);
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <p className="text-slate-500">Failed to load dashboard. Please try refreshing.</p>
            </div>
        );
    }

    const applications = appData.data || [];
    const savedJobs = savedData.data || [];

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
