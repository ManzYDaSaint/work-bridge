import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { syncSeekerEmbedding, syncJobEmbedding } from "@/lib/sync-embeddings";
import { sendAdminSecurityAlert } from "@/lib/resend";

// Vercel Cron routes can be triggered by sending an authorization header
// or simply allowing public execution with a secret. For security:
const CRON_SECRET = process.env.CRON_SECRET || "local-cron-secret";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
        return new NextResponse("Admin client not initialized", { status: 500 });
    }

    let syncedSeekersCount = 0;
    let syncedJobsCount = 0;
    let errors: string[] = [];

    try {
        // 1. Process Job Seekers with missing embeddings
        // Only select those whose visibility is not HIDDEN to prioritize active profiles
        const { data: seekers, error: seekersError } = await supabase
            .from("job_seekers")
            .select("*")
            .is("embedding", null)
            .neq("profile_visibility", "HIDDEN")
            .limit(50); // Batch size to prevent timeouts

        if (seekersError) {
            throw new Error(`Failed to fetch seekers: ${seekersError.message}`);
        }

        if (seekers && seekers.length > 0) {
            for (const seeker of seekers) {
                try {
                    await syncSeekerEmbedding(seeker.id, seeker);
                    syncedSeekersCount++;
                } catch (err: any) {
                    errors.push(`Seeker ${seeker.id}: ${err.message}`);
                }
            }
        }

        // 2. Process Jobs with missing embeddings
        const { data: jobs, error: jobsError } = await supabase
            .from("jobs")
            .select("*")
            .is("embedding", null)
            .eq("status", "ACTIVE")
            .limit(50);

        if (jobsError) {
            throw new Error(`Failed to fetch jobs: ${jobsError.message}`);
        }

        if (jobs && jobs.length > 0) {
            for (const job of jobs) {
                try {
                    await syncJobEmbedding(job.id, job);
                    syncedJobsCount++;
                } catch (err: any) {
                    errors.push(`Job ${job.id}: ${err.message}`);
                }
            }
        }

        // 3. Notify Admin if anything was synced or if there were errors
        if (syncedSeekersCount > 0 || syncedJobsCount > 0 || errors.length > 0) {
            const details = `Automated Resync Report:
            - Seekers Synced: ${syncedSeekersCount}
            - Jobs Synced: ${syncedJobsCount}
            - Errors: ${errors.length > 0 ? errors.join(" | ") : "None"}`;

            await sendAdminSecurityAlert({
                event: "Embedding Resync Cron Executed",
                details: details,
            });
            console.log("[CRON] Admin notified of embedding resync.");
        }

        return NextResponse.json({
            success: true,
            syncedSeekers: syncedSeekersCount,
            syncedJobs: syncedJobsCount,
            errors
        });

    } catch (error: any) {
        console.error("[CRON] Automated Resync Error:", error);
        
        await sendAdminSecurityAlert({
            event: "Embedding Resync Cron Failed",
            details: `Fatal Error: ${error.message}`,
        });

        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
