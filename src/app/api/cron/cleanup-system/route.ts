import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { emitSystemEvent } from "@/lib/mission-control";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const authHeader = req.headers.get("authorization");
    if (
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
        return NextResponse.json({ error: "Failed to connect to database" }, { status: 500 });
    }

    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoff = thirtyDaysAgo.toISOString();

        // 1. Cleanup old ingestion payloads (keep for 30 days)
        await supabase.from('ingested_raw_payloads').delete().in('processing_status', ['PARSED', 'FAILED', 'PENDING']).lt('created_at', cutoff);

        // 2. Cleanup old system audit logs (keep for 30 days)
        await supabase.from('audit_logs').delete().lt('created_at', cutoff);

        // 3. Cleanup old completed automation tasks (keep for 30 days)
        await supabase.from('automation_tasks').delete().eq('status', 'COMPLETED').lt('created_at', cutoff);

        // 4. Cleanup old AI health logs (keep for 30 days)
        await supabase.from('ai_health_logs').delete().lt('created_at', cutoff);

        // 5. Cleanup old email logs (keep for 30 days)
        await supabase.from('email_logs').delete().lt('created_at', cutoff);

        // 6. Cleanup old system events (keep for 30 days)
        await supabase.from('mission_control_events').delete().lt('created_at', cutoff);

        // 7. Cleanup old opportunity views (keep for 30 days)
        await supabase.from('opportunity_views').delete().lt('viewed_at', cutoff);

        await emitSystemEvent({
            category: "SYSTEM",
            severity: "INFO",
            event: "SYSTEM_CLEANUP_COMPLETE",
            message: "System cleanup cron completed",
            metadata: { cutoff }
        });

        return NextResponse.json({
            success: true,
            message: "All cleanup tasks executed",
        });

    } catch (error) {
        console.error("[CRON] System Cleanup Failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
