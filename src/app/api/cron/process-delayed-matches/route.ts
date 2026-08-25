import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { triggerDelayedFreeMatchNotifications } from "@/lib/match-notification-service";
import { emitSystemEvent } from "@/lib/mission-control";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
        return new NextResponse("Admin client not initialized", { status: 500 });
    }

    try {
        await emitSystemEvent({
            category: "MATCHING",
            severity: "INFO",
            event: "DELAYED_MATCHES_CRON_STARTED",
            message: "Processing delayed match notifications",
            metadata: {}
        });
        // Fetch jobs created roughly between 24 and 25 hours ago
        const now = new Date();
        const start = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();
        const end = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

        const { data: jobs, error } = await supabase
            .from("jobs")
            .select("id")
            .eq("status", "ACTIVE")
            .gte("created_at", start)
            .lte("created_at", end);

        if (error) {
            throw new Error(`Failed to fetch jobs for delayed matching: ${error.message}`);
        }

        let processedCount = 0;
        if (jobs && jobs.length > 0) {
            for (const job of jobs) {
                // Trigger match for free users
                await triggerDelayedFreeMatchNotifications(job.id);
                processedCount++;
            }
        }

        await emitSystemEvent({
            category: "MATCHING",
            severity: "SUCCESS",
            event: "DELAYED_MATCHES_CRON_COMPLETED",
            message: `Processed ${processedCount} delayed match jobs`,
            metadata: { jobsProcessed: processedCount }
        });

        return NextResponse.json({
            success: true,
            jobsProcessed: processedCount
        });

    } catch (error: any) {
        console.error("[CRON] Delayed Match Processing Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
