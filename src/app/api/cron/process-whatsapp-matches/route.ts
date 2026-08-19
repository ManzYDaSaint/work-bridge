import { NextResponse } from "next/server";
import { runJobMatchingOrchestration } from "@/lib/notification/orchestrator";
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
            event: "WHATSAPP_MATCHING_CRON_STARTED",
            message: "Running WhatsApp job matching orchestration & queue delivery",
            metadata: {}
        });

        // Run orchestration to match active jobs with premium seekers & queue notifications
        await runJobMatchingOrchestration();

        // Process any remaining pending items in notification_queue
        await processNotificationQueue();

        await emitSystemEvent({
            category: "MATCHING",
            severity: "SUCCESS",
            event: "WHATSAPP_MATCHING_CRON_COMPLETED",
            message: "WhatsApp job matching and delivery processed successfully",
            metadata: {}
        });

        return NextResponse.json({
            success: true,
            message: "WhatsApp job matching and delivery completed."
        });
    } catch (err: any) {
        console.error("[CRON] process-whatsapp-matches error:", err);
        await emitSystemEvent({
            category: "MATCHING",
            severity: "CRITICAL",
            event: "WHATSAPP_MATCHING_CRON_FAILED",
            message: `WhatsApp matching cron failed: ${err.message}`,
            metadata: { error: err.message }
        });

        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}
