import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: employer, error: empError } = await supabase
        .from("employers")
        .select("id")
        .eq("id", user.id)
        .single();

    if (empError || !employer) {
        return NextResponse.json({ error: "Employer profile not found" }, { status: 404 });
    }

    try {
        const [jobsRes, appsRes, employerRes, interviewAppsRes] = await Promise.all([
            supabase
                .from("jobs")
                .select("id", { count: "exact", head: true })
                .eq("employer_id", employer.id),
            supabase
                .from("applications")
                .select("id", { count: "exact", head: true })
                .filter("job.employer_id", "eq", employer.id),
            supabase
                .from("employers")
                .select("profile_views")
                .eq("id", user.id)
                .single(),
            supabase
                .from("applications")
                .select("id", { count: "exact", head: true })
                .eq("status", "INTERVIEWING")
                .filter("job.employer_id", "eq", employer.id)
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
