import { redirect } from "next/navigation";
import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import RecommendedJobsClient from "./RecommendedJobsClient";

export default async function RecommendedJobsPage() {
    // 1. Server-side Auth Check
    const auth = await validateAuth(["JOB_SEEKER"]);
    if (auth.error) redirect("/login");

    const supabase = await createSupabaseServerClient();
    const user = auth.user;

    // 2. Check Quota (recommendation_count)
    // We only increment quota when they explicitly use discovery, 
    // or maybe simply viewing this page costs a quota? 
    // Let's implement the quota check:
    const { data: quota } = await supabase
        .from("user_quotas")
        .select("recommendation_count")
        .eq("user_id", user.id)
        .single();
    
    const usage = quota?.recommendation_count || 0;
    const FREE_LIMIT = 10;
    
    // We could restrict viewing if usage >= FREE_LIMIT
    // For now, let's just pass this down or log it
    
    // 3. Fetch user embedding
    const { data: seekerData } = await supabase
        .from("job_seekers")
        .select("embedding")
        .eq("id", user.id)
        .single();

    if (!seekerData?.embedding) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Profile needs an update</h2>
                <p className="mt-2 text-slate-500">We need more information about your skills and experience to recommend jobs. Please update your profile.</p>
            </div>
        );
    }

    // 4. Call the RPC to get matches
    const { data: matches, error: rpcError } = await supabase.rpc("match_jobs_for_seeker", {
        query_embedding: seekerData.embedding,
        match_threshold: 0.15,
        match_count: 15
    });

    if (rpcError) {
        console.error("RPC Error:", rpcError);
        return <div className="p-6 text-red-500">Failed to load recommendations.</div>;
    }

    const jobIds = matches?.map((m: any) => m.id) || [];
    
    // 5. Fetch full job details
    let fullJobs = [];
    if (jobIds.length > 0) {
        const { data: jobs } = await supabase
            .from("jobs")
            .select("*, employer(*)")
            .in("id", jobIds)
            .eq("status", "ACTIVE");
            
        fullJobs = jobs || [];
    }

    // Combine similarity score into the full jobs
    const jobsWithScores = fullJobs.map(job => {
        const matchInfo = matches?.find((m: any) => m.id === job.id);
        return {
            ...job,
            similarity: matchInfo?.similarity || 0
        };
    }).sort((a, b) => b.similarity - a.similarity);

    // Increment quota via RPC since they viewed recommendations
    if (usage < FREE_LIMIT) {
       await supabase.rpc('consume_quota', { p_user_id: user.id, p_quota_type: 'recommendation', p_limit: FREE_LIMIT });
    }

    return (
        <RecommendedJobsClient 
            jobs={jobsWithScores} 
            usage={usage} 
            limit={FREE_LIMIT} 
        />
    );
}
