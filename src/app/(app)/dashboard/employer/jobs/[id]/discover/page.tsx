import { requireDashboardProfile } from "@/lib/dashboard-auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { RecommendationService } from "@/services/recommendation.service";
import RecommendedCandidatesClient from "./RecommendedCandidatesClient";

export default async function JobDiscoveryPage({
    params
}: {
    params: Promise<{ id: string }>;
}) {
    const { profile: user } = await requireDashboardProfile("EMPLOYER");
    const resolvedParams = await params;
    const jobId = resolvedParams.id;

    const supabase = await createSupabaseServerClient();

    // 1. Fetch the Job to ensure it belongs to the employer and has an embedding
    const { data: job } = await supabase
        .from("jobs")
        .select("id, title, embedding, skills, must_have_skills, nice_to_have_skills, location, qualification")
        .eq("id", jobId)
        .eq("employer_id", user.id)
        .single();

    if (!job) {
        return <div className="p-6 text-red-500">Job not found or unauthorized.</div>;
    }

    // (Note: embedding check removed — matching uses rule engine directly)

    // 2. Fetch Quota
    const { data: quota } = await supabase
        .from("user_quotas")
        .select("discovery_count")
        .eq("user_id", user.id)
        .single();
    
    const usage = quota?.discovery_count || 0;
    const FREE_LIMIT = 30;

    // 3. Use the unified discovery service for matched candidates
    let candidates: any[] = [];
    try {
        candidates = await RecommendationService.discoverTalent(job, user.id, {
            limit: 20,
        });
    } catch (error: any) {
        console.error("Employer discovery service failed:", error);
        return (
            <div className="p-8 text-center border border-red-200 bg-red-50/50 rounded-2xl dark:border-red-900/30 dark:bg-red-950/20">
                <h3 className="text-base font-semibold text-red-700 dark:text-red-400">Failed to load candidate recommendations</h3>
                <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/80">{error?.message || "An unexpected error occurred while fetching AI recommendations."}</p>
            </div>
        );
    }

    return (
        <RecommendedCandidatesClient 
            job={job}
            candidates={candidates} 
            usage={usage} 
            limit={FREE_LIMIT} 
            plan={user.plan}
        />
    );
}


export const dynamic = "force-dynamic";
