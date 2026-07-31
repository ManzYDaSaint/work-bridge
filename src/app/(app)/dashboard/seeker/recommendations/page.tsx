import { redirect } from "next/navigation";
import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { fetchJobsWithEmployers } from "@/lib/seeker-data";
import RecommendedJobsClient from "./RecommendedJobsClient";
import type { ExtendedJob } from "@/components/jobs/JobDetailModal";

type JobWithScore = ExtendedJob & { similarity: number };

export default async function RecommendedJobsPage() {
    // 1. Server-side Auth Check
    const auth = await validateAuth(["JOB_SEEKER"]);
    if (auth.error) redirect("/login");

    const supabase = await createSupabaseServerClient();
    const user = auth.user;

    // Seeker AI recommendations are unlimited — no quota gate

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
    const embedding = typeof seekerData.embedding === "string" 
        ? JSON.parse(seekerData.embedding) 
        : seekerData.embedding;

    const { data: matches, error: rpcError } = await supabase.rpc("match_jobs_for_seeker", {
        query_embedding: embedding,
    });

    if (rpcError) {
        const errorStr = JSON.stringify(rpcError);
        if (errorStr.includes("PGRST202")) {
            // Silently handle the missing function in console, but show UI state
            return (
                <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Recommendations initializing</h2>
                    <p className="mt-2 text-slate-500 max-w-md">
                        Our AI matching system is currently being updated to provide better recommendations. 
                        Please check back shortly or browse the main job board.
                    </p>
                </div>
            );
        }
        
        console.error("RPC Error:", JSON.stringify(rpcError, null, 2));
        return <div className="p-6 text-red-500">Failed to load recommendations.</div>;
    }

    const jobIds = matches?.map((m: any) => m.id) || [];
    
    // 5. Fetch full job details (employers fetched separately to avoid RLS join issues)
    const { data: fullJobs, error: jobsError } = await fetchJobsWithEmployers(
        supabase,
        jobIds,
        { status: "ACTIVE" }
    );

    if (jobsError) {
        console.error("Recommendations jobs fetch error:", jobsError.message);
        return <div className="p-6 text-red-500">Failed to load recommendations.</div>;
    }

    // Combine similarity score into the full jobs
    const jobsWithScores: JobWithScore[] = fullJobs.map((job) => {
        const matchInfo = matches?.find((m: any) => m.id === job.id);
        return {
            ...(job as unknown as ExtendedJob),
            similarity: matchInfo?.similarity || 0,
        };
    }).sort((a, b) => b.similarity - a.similarity);

    // Increment quota via RPC since they viewed recommendations
    // REMOVED: Seekers have unlimited recommendations

    return (
        <RecommendedJobsClient 
            jobs={jobsWithScores}
        />
    );
}


export const dynamic = "force-dynamic";
