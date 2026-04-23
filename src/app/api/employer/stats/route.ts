import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const auth = await validateAuth(["EMPLOYER"]);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();
    const employerId = auth.userId;

    try {
        // Step 1: Fetch this employer's ACTIVE job IDs
        const { data: activeJobRows, error: jobErr } = await supabase
            .from("jobs")
            .select("id")
            .eq("employer_id", employerId)
            .eq("status", "ACTIVE");

        if (jobErr) throw jobErr;

        const activeJobIds = (activeJobRows || []).map((j) => j.id);
        const activeJobs = activeJobIds.length;

        // Step 2: If no active jobs, skip application queries
        if (activeJobs === 0) {
            return NextResponse.json({
                activeJobs: 0,
                totalApplicants: 0,
                shortlisted: 0,
                interviewsSet: 0,
            });
        }

        // Step 3: Count applications per status using job IDs
        const [allAppsRes, shortlistedRes, interviewingRes] = await Promise.all([
            supabase
                .from("applications")
                .select("id", { count: "exact", head: true })
                .in("job_id", activeJobIds),
            supabase
                .from("applications")
                .select("id", { count: "exact", head: true })
                .in("job_id", activeJobIds)
                .in("status", ["SHORTLISTED", "ACCEPTED"]),
            supabase
                .from("applications")
                .select("id", { count: "exact", head: true })
                .in("job_id", activeJobIds)
                .eq("status", "INTERVIEWING"),
        ]);

        const response = NextResponse.json({
            activeJobs,
            totalApplicants: allAppsRes.count || 0,
            shortlisted: shortlistedRes.count || 0,
            interviewsSet: interviewingRes.count || 0,
        });
        response.headers.set("Cache-Control", "no-store, max-age=0");
        return response;
    } catch (error) {
        console.error("Employer Stats GET error:", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
