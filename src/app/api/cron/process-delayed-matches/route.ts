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

        // Process any queued delayed match emails in notification_queue whose scheduled_for <= now
        const nowIso = new Date().toISOString();
        const { data: queuedFreeEmails } = await supabase
            .from("notification_queue")
            .select("id, payload, seeker_id, job_id")
            .eq("status", "PENDING")
            .lte("scheduled_for", nowIso)
            .filter("payload->>channel", "eq", "EMAIL")
            .limit(25);

        let queuedSentCount = 0;
        if (queuedFreeEmails && queuedFreeEmails.length > 0) {
            const { sendStandardJobMatchEmail } = await import("@/lib/notification/email-matching");

            for (const item of queuedFreeEmails) {
                const payload = item.payload || {};
                const email = payload.email;
                if (!email) continue;

                const res = await sendStandardJobMatchEmail({
                    seekerEmail: email,
                    seekerName: payload.seekerName || "Job Seeker",
                    jobTitle: payload.jobTitle || "Job Opportunity",
                    companyName: payload.company || "Direct Employer",
                    location: payload.location || "Malawi",
                    jobId: item.job_id,
                    matchScore: payload.matchScore || 50,
                });

                if (res.success) {
                    queuedSentCount++;
                    await supabase
                        .from("notification_queue")
                        .update({ status: "SENT" })
                        .eq("id", item.id);
                } else {
                    await supabase
                        .from("notification_queue")
                        .update({ status: "FAILED", last_error: res.error })
                        .eq("id", item.id);
                }
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
