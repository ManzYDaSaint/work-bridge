import { createSupabaseServerClient } from "@/lib/supabase-server";

export interface ApplicationWithDetails {
    id: string;
    status: string;
    createdAt: string;
    screeningScore?: number;
    meetsRequiredCriteria?: boolean;
    screeningSummary?: string;
    screeningBreakdown?: any[];
    user: {
        id: string;
        email: string;
        jobSeeker: {
            full_name: string;
            location?: string;
            phone?: string;
            bio?: string;
            skills?: string[];
            experience?: any[];
        };
    };
    job: {
        title: string;
    };
}

export interface PaginatedApplicationsResponse {
    data: ApplicationWithDetails[];
    total: number;
    totalPages: number;
    page: number;
    limit: number;
}

export const ApplicationService = {
    async getEmployerApplications(
        employerId: string,
        jobId?: string,
        page: number = 1,
        limit: number = 50
    ): Promise<PaginatedApplicationsResponse> {
        const supabase = await createSupabaseServerClient();
        const offset = (page - 1) * limit;

        // Resolve owned job IDs first for DB-level ownership enforcement
        const { data: ownedJobs, error: jobsError } = await supabase
            .from("jobs")
            .select("id")
            .eq("employer_id", employerId);

        if (jobsError) throw new Error("Failed to verify job ownership");

        const ownedJobIds = (ownedJobs || []).map((j) => j.id);
        if (ownedJobIds.length === 0) {
            return { data: [], total: 0, totalPages: 0, page, limit };
        }

        const targetJobIds = jobId ? [jobId] : ownedJobIds;

        const { data, error, count } = await supabase
            .from("applications")
            .select(`
                id,
                status,
                created_at,
                screening_score,
                meets_required_criteria,
                screening_summary,
                screening_breakdown,
                user:users (
                    id,
                    email,
                    jobSeeker:job_seekers (*)
                ),
                job:jobs (
                    title
                )
            `, { count: "exact" })
            .in("job_id", targetJobIds)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw new Error("Failed to fetch applications");

        return {
            data: (data || []).map((app: any) => ({
                id: app.id,
                status: app.status,
                createdAt: app.created_at,
                screeningScore: app.screening_score,
                meetsRequiredCriteria: app.meets_required_criteria,
                screeningSummary: app.screening_summary,
                screeningBreakdown: app.screening_breakdown,
                user: {
                    id: app.user.id,
                    email: app.user.email,
                    jobSeeker: app.user.jobSeeker,
                },
                job: {
                    title: app.job?.title || "Role",
                },
            })),
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
            page,
            limit,
        };
    }
};
