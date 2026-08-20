import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { syncJobEmbedding } from "@/lib/sync-embeddings";

export async function GET() {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: "Admin client unavailable" }, { status: 500 });

    try {
        // Jobs with no embedding (won't trigger matching)
        const { data: noEmbedding, count: noEmbedCount } = await supabase
            .from("jobs")
            .select("id, title, display_company_name, created_at, status", { count: "exact" })
            .eq("status", "ACTIVE")
            .is("embedding", null);

        // Jobs active but past deadline
        const { data: pastDeadline } = await supabase
            .from("jobs")
            .select("id, title, display_company_name, deadline, status")
            .eq("status", "ACTIVE")
            .not("deadline", "is", null)
            .lt("deadline", new Date().toISOString());

        // Active jobs with zero applications (fetch all active, check counts)
        const { data: activeJobs } = await supabase
            .from("jobs")
            .select("id, title, display_company_name, created_at")
            .eq("status", "ACTIVE")
            .lt("created_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

        // Check application counts in bulk
        let noApps: any[] = [];
        if (activeJobs && activeJobs.length > 0) {
            const { data: appCounts } = await supabase
                .from("applications")
                .select("job_id")
                .in("job_id", activeJobs.map(j => j.id));

            const jobsWithApps = new Set((appCounts || []).map(a => a.job_id));
            noApps = activeJobs.filter(j => !jobsWithApps.has(j.id));
        }

        // Jobs pending moderation
        const { data: pendingJobs, count: pendingCount } = await supabase
            .from("jobs")
            .select("id, title, display_company_name, created_at", { count: "exact" })
            .eq("status", "PENDING");

        return NextResponse.json({
            stats: {
                noEmbedding: noEmbedCount || 0,
                pastDeadline: pastDeadline?.length || 0,
                noApplications: noApps.length,
                pendingModeration: pendingCount || 0,
            },
            noEmbedding: (noEmbedding || []).slice(0, 20),
            pastDeadline: (pastDeadline || []).slice(0, 20),
            noApplications: noApps.slice(0, 20),
            pendingJobs: (pendingJobs || []).slice(0, 20),
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: "Admin client unavailable" }, { status: 500 });

    try {
        const body = await request.json().catch(() => ({}));
        const targetJobId = body.jobId;

        let query = supabase.from("jobs").select("*").eq("status", "ACTIVE");
        if (targetJobId) {
            query = query.eq("id", targetJobId);
        } else {
            query = query.is("embedding", null);
        }

        const { data: jobs, error } = await query.limit(50);
        if (error) throw error;

        let syncedCount = 0;
        const errors: string[] = [];

        if (jobs && jobs.length > 0) {
            for (const job of jobs) {
                try {
                    await syncJobEmbedding(job.id, job);
                    syncedCount++;
                } catch (e: any) {
                    errors.push(`Job ${job.id}: ${e.message}`);
                }
            }
        }

        return NextResponse.json({
            success: true,
            syncedCount,
            errors,
            message: `Successfully generated embeddings for ${syncedCount} job(s).`
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
