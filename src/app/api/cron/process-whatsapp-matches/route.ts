import { NextResponse } from "next/server";
import { runStandardJobMatchingCron, runJobMatchingOrchestration } from "@/lib/notification/orchestrator";
import { processNotificationQueue } from "@/lib/notification/worker";
import { emitSystemEvent } from "@/lib/mission-control";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const authHeader = req.headers.get("authorization");
    if (
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        await emitSystemEvent({
            category: "MATCHING",
            severity: "INFO",
            event: "JOB_MATCHING_CRON_STARTED",
            message: "Running standard job matching (Email) & processing pending WhatsApp notifications",
            metadata: {}
        });

        // 1. Run standard (non-premium) seeker job matching & send emails
        const emailResult = await runStandardJobMatchingCron();

        // 2. Also run general orchestration check
        await runJobMatchingOrchestration();

        // 3. Process any remaining approved pending items in notification_queue
        await processNotificationQueue();

        await emitSystemEvent({
            category: "MATCHING",
            severity: "SUCCESS",
            event: "JOB_MATCHING_CRON_COMPLETED",
            message: `Job matching CRON completed. Standard emails sent: ${emailResult.sent}`,
            metadata: emailResult
        });

        return NextResponse.json({
            success: true,
            message: "Two-tier job matching and delivery completed.",
            emailStats: emailResult
        });
    } catch (err: any) {
        console.error("[CRON] process-whatsapp-matches error:", err);
        await emitSystemEvent({
            category: "MATCHING",
            severity: "CRITICAL",
            event: "JOB_MATCHING_CRON_FAILED",
            message: err.message || "Failed to process job matching CRON",
            metadata: { error: err.message }
        });

        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
