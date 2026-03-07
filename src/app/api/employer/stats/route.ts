import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
    const auth = await validateAuth(["EMPLOYER"]);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();
    const employerId = auth.userId;

    try {
        const [jobsRes, appsRes, employerRes, interviewAppsRes] = await Promise.all([
            supabase
                .from("jobs")
                .select("id", { count: "exact", head: true })
                .eq("employer_id", employerId),
            supabase
                .from("applications")
                .select("id", { count: "exact", head: true })
                .filter("job.employer_id", "eq", employerId),
            supabase
                .from("employers")
                .select("profile_views")
                .eq("id", employerId)
                .single(),
            supabase
                .from("applications")
                .select("id", { count: "exact", head: true })
                .eq("status", "INTERVIEWING")
                .filter("job.employer_id", "eq", employerId)
        ]);

        return NextResponse.json({
            activeJobs: jobsRes.count || 0,
            totalApplicants: appsRes.count || 0,
            profileViews: employerRes.data?.profile_views || 0,
            interviewsSet: interviewAppsRes.count || 0,
        });
    } catch (error) {
        console.error("Employer Stats GET error:", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
