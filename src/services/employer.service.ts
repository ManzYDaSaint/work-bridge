import { createSupabaseServerClient } from "@/lib/supabase-server";

export interface EmployerStats {
    activeJobs: number;
    totalApplicants: number;
    shortlisted: number;
    interviewsSet: number;
}

export const EmployerService = {
    async getEmployerStats(employerId: string): Promise<EmployerStats> {
        const supabase = await createSupabaseServerClient();

        const { data: activeJobRows, error: jobErr } = await supabase
            .from("jobs")
            .select("id")
            .eq("employer_id", employerId)
            .eq("status", "ACTIVE");

        if (jobErr) throw new Error("Failed to fetch active jobs");

        const activeJobIds = (activeJobRows || []).map((j) => j.id);
        const activeJobs = activeJobIds.length;

        if (activeJobs === 0) {
            return { activeJobs: 0, totalApplicants: 0, shortlisted: 0, interviewsSet: 0 };
        }

        const [allAppsRes, shortlistedRes, interviewingRes] = await Promise.all([
            supabase.from("applications").select("id", { count: "exact", head: true }).in("job_id", activeJobIds),
            supabase.from("applications").select("id", { count: "exact", head: true }).in("job_id", activeJobIds).in("status", ["SHORTLISTED", "ACCEPTED"]),
            supabase.from("applications").select("id", { count: "exact", head: true }).in("job_id", activeJobIds).eq("status", "INTERVIEWING"),
        ]);

        return {
            activeJobs,
            totalApplicants: allAppsRes.count || 0,
            shortlisted: shortlistedRes.count || 0,
            interviewsSet: interviewingRes.count || 0,
        };
    }
};
