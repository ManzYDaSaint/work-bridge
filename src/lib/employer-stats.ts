import { createSupabaseServerClient } from "./supabase-server";

export interface EmployerStats {
    activeJobs: number;
    totalApplicants: number;
    shortlisted: number;
    interviewsSet: number;
}

/**
 * Server-side function to fetch employer statistics.
 * Used by both the API route and Server Components.
 */
export async function getEmployerStats(employerId: string): Promise<EmployerStats> {
    const supabase = await createSupabaseServerClient();

    // Step 1: Fetch this employer's ACTIVE job IDs
    const { data: activeJobRows, error: jobErr } = await supabase
        .from("jobs")
        .select("id")
        .eq("employer_id", employerId)
        .eq("status", "ACTIVE");

    if (jobErr) {
        console.error("Error fetching active jobs for stats:", jobErr);
        throw new Error("Failed to fetch active jobs");
    }

    const activeJobIds = (activeJobRows || []).map((j) => j.id);
    const activeJobs = activeJobIds.length;

    // Step 2: If no active jobs, skip application queries
    if (activeJobs === 0) {
        return {
            activeJobs: 0,
            totalApplicants: 0,
            shortlisted: 0,
            interviewsSet: 0,
        };
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

    return {
        activeJobs,
        totalApplicants: allAppsRes.count || 0,
        shortlisted: shortlistedRes.count || 0,
        interviewsSet: interviewingRes.count || 0,
    };
}
