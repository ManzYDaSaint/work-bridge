"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function getLiveMetrics() {
    try {
        const supabase = await createSupabaseServerClient();

        // Count jobs
        const { count: jobsCount, error: jobsError } = await supabase
            .from("jobs")
            .select("*", { count: "exact", head: true });

        if (jobsError) {
            console.error("Error fetching jobs count:", jobsError);
        }

        // Count job seekers
        // Checking users table where role is JOB_SEEKER or just count from job_seekers if it exists
        const { count: seekersCount, error: seekersError } = await supabase
            .from("users")
            .select("*", { count: "exact", head: true })
            .eq("role", "JOB_SEEKER");

        if (seekersError) {
            console.error("Error fetching seekers count:", seekersError);

            // Fallback: maybe there is a job_seekers table?
            const { count: fallbackSeekersCount } = await supabase
                .from("job_seekers")
                .select("*", { count: "exact", head: true });

            return {
                activeJobs: jobsCount || 0,
                talentProfiles: fallbackSeekersCount || 0
            }
        }

        // Fetch recent activities
        const { data: recentJobsData } = await supabase
            .from("jobs")
            .select(`
                title,
                location,
                created_at,
                employer:employers(company_name)
            `)
            .order("created_at", { ascending: false })
            .limit(5);

        const recentActivities = (recentJobsData || []).map(job => {
            const employer = Array.isArray(job.employer) ? job.employer[0] : job.employer;
            return {
                company: employer?.company_name || "Confidential",
                role: job.title,
                location: job.location || "Remote",
                time: job.created_at
            };
        });

        return {
            activeJobs: jobsCount || 0,
            talentProfiles: seekersCount || 0,
            recentActivities
        };
    } catch (error) {
        console.error("Failed to fetch live metrics:", error);
        return { activeJobs: 0, talentProfiles: 0, recentActivities: [] };
    }
}
