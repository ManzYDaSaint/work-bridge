import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

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

        // 1. Cleanup old parsed ingestion payloads (keep for 30 days)
        const { error: payloadErr } = await supabase
            .from('ingested_raw_payloads')
            .delete()
            .eq('processing_status', 'PARSED')
            .lt('created_at', cutoff);

        if (payloadErr) {
            console.error("[CRON] Cleanup Payloads Error:", payloadErr);
        }

        // 2. Cleanup old system audit logs (keep for 30 days)
        const { error: auditErr } = await supabase
            .from('system_events')
            .delete()
            .lt('created_at', cutoff);

        if (auditErr) {
            console.error("[CRON] Cleanup Audit Logs Error:", auditErr);
        }

        return NextResponse.json({
            success: true,
            message: "Cleanup tasks executed",
        });

    } catch (error) {
        console.error("[CRON] System Cleanup Failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
