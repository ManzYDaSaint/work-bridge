import { requireDashboardProfile } from "@/lib/dashboard-auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
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
        .select("id, title, embedding")
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
    const FREE_LIMIT = 5;

    // 3. Call the RPC to get recommended candidates
    const { data: matches, error: rpcError } = await supabase.rpc("match_candidates", {
        query_embedding: job.embedding,
        match_threshold: 0.15,
        match_count: 10
    });

    if (rpcError) {
        console.error("RPC Error:", rpcError);
        return <div className="p-6 text-red-500">Failed to load recommendations.</div>;
    }

    const candidateIds = matches?.map((m: any) => m.id) || [];

    // 4. Fetch full candidate details
    let fullCandidates: any[] = [];
    if (candidateIds.length > 0) {
        const { data: seekers } = await supabase
            .from("job_seekers")
            .select("*")
            .in("id", candidateIds)
            .neq("profile_visibility", "HIDDEN");
            
        let validSeekers = seekers || [];
        
        if (validSeekers.length > 0) {
            const { getSupabaseAdminClient } = await import("@/lib/supabase-admin");
            const adminClient = getSupabaseAdminClient();
            if (adminClient) {
                const fetchedIds = validSeekers.map(s => s.id);
                const { data: userRoles } = await adminClient
                    .from("users")
                    .select("id, role")
                    .in("id", fetchedIds);
                
                if (userRoles) {
                    const validIds = new Set(userRoles.filter(u => u.role === "JOB_SEEKER").map(u => u.id));
                    validSeekers = validSeekers.filter(s => validIds.has(s.id));
                }
            }
        }
            
        fullCandidates = validSeekers;
    }

    // Combine similarity score
    const candidatesWithScores = fullCandidates.map(candidate => {
        const matchInfo = matches?.find((m: any) => m.id === candidate.id);
        return {
            ...candidate,
            similarity: matchInfo?.similarity || 0
        };
    }).sort((a, b) => b.similarity - a.similarity);

    // Consume Quota
    if (usage < FREE_LIMIT) {
        await supabase.rpc('consume_quota', { p_user_id: user.id, p_quota_type: 'discovery', p_limit: FREE_LIMIT });
    }

    return (
        <RecommendedCandidatesClient 
            job={job}
            candidates={candidatesWithScores} 
            usage={usage} 
            limit={FREE_LIMIT} 
            plan={user.plan}
        />
    );
}
