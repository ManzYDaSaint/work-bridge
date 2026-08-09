/**
 * Cron: /api/cron/process-automation
 *
 * Processes pending automation_tasks from the queue.
 * Handles plugins like: crm-manager, email-notifier, buffer-social-poster.
 *
 * Schedule: every 5 minutes via vercel.json
 * Auth: Bearer CRON_SECRET header (set by Vercel)
 */

import { NextResponse } from "next/server";
import { processQueue } from "@/lib/automation/engine";
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
            category: "AUTOMATION",
            severity: "INFO",
            event: "PROCESS_AUTOMATION_CRON_STARTED",
            message: "Processing automation queue",
            metadata: {}
        });
        await processQueue();
        await emitSystemEvent({
            category: "AUTOMATION",
            severity: "SUCCESS",
            event: "PROCESS_AUTOMATION_CRON_COMPLETED",
            message: "Automation queue processed successfully",
            metadata: {}
        });

        return NextResponse.json({ success: true, message: "Automation queue processed." });
    } catch (err: any) {
        console.error("[CRON] process-automation error:", err);
        await emitSystemEvent({
            category: "AUTOMATION",
            severity: "CRITICAL",
            event: "PROCESS_AUTOMATION_CRON_FAILED",
            message: `Automation processing failed: ${err.message}`,
            metadata: { error: err.message }
        });

        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}
