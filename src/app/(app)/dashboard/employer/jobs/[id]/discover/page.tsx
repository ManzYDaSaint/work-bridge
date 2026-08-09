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

    if (!job.embedding) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">AI Processing</h2>
                <p className="mt-2 text-slate-500">We are still processing the AI embedding for this job. Please check back in a few moments.</p>
            </div>
        );
    }

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
        candidates = await RecommendationService.discoverTalent(jobId, user.id, {
            limit: 20,
            threshold: 0.50,
        });
    } catch (error: any) {
        console.error("Employer discovery service failed:", error);
        return <div className="p-6 text-red-500">Failed to load recommendations.</div>;
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
