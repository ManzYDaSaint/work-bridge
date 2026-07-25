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
        await processQueue();
        return NextResponse.json({ success: true, message: "Automation queue processed." });
    } catch (err: any) {
        console.error("[CRON] process-automation error:", err);
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}
