import { requireDashboardProfile } from "@/lib/dashboard-auth";
import { ApplicationService } from "@/services/application.service";
import CandidatesClient from "../CandidatesClient";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function CandidatesPage({
    searchParams,
}: {
    searchParams: Promise<{ jobId?: string; page?: string }>;
}) {
    const { profile: user } = await requireDashboardProfile("EMPLOYER");
    const params = await searchParams;
    const page = parseInt(params.page || "1");
    
    let { data: applications } = await ApplicationService.getEmployerApplications(
        user.id,
        params.jobId,
        page
    );

    // AI Applicant Ranking (Phase 3)
    if (params.jobId && applications && applications.length > 0) {
        const supabase = await createSupabaseServerClient();
        const { data: rankings } = await supabase.rpc("rank_applicants", {
            p_job_id: params.jobId
        });

        if (rankings) {
            // Merge similarity score
            applications = applications.map(app => {
                const rankInfo = rankings.find((r: any) => r.application_id === app.id);
                return {
                    ...app,
                    similarity: rankInfo?.similarity || 0
                };
            });
        }
    }

    return (
        <CandidatesClient 
            initialApplications={applications} 
            plan={user.plan}
        />
    );
}

