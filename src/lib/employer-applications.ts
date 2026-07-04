import { createSupabaseServerClient } from "@/lib/supabase-server";

export interface ApplicationWithDetails {
    id: string;
    status: "PENDING" | "ACCEPTED" | "REJECTED" | "SHORTLISTED" | "INTERVIEWING";
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

/**
 * Server-side function to fetch applications for an employer.
 */
export async function getEmployerApplications(
    employerId: string,
    jobId?: string
): Promise<ApplicationWithDetails[]> {
    const supabase = await createSupabaseServerClient();

    let query = supabase
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
        `)
        .eq("job.employer_id", employerId);

    if (jobId) {
        query = query.eq("job_id", jobId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
        console.error("Get Employer Applications error:", error);
        throw new Error("Failed to fetch applications");
    }

    return (data || []).map((app: any) => ({
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
    }));
}
