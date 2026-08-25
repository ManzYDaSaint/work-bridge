import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { emitSystemEvent } from "@/lib/mission-control";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    // Authenticate Vercel Cron
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const supabase = getSupabaseAdminClient();
        if (!supabase) {
            return NextResponse.json({ success: false, error: "Database admin client unavailable" }, { status: 500 });
        }
        
        // Calculate the date 30 days ago
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoffDate = thirtyDaysAgo.toISOString();

        // Delete notifications that are READ and older than 30 days
        const { error, count } = await supabase
            .from("notifications")
            .delete({ count: 'exact' })
            .eq('is_read', true)
            .lt('created_at', cutoffDate);

        if (error) {
            console.error("[CRON] Database optimization error:", error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        await emitSystemEvent({
            category: "NOTIFICATION",
            severity: "INFO",
            event: "PRUNE_NOTIFICATIONS_CRON_COMPLETED",
            message: `Pruned ${count || 0} read notifications`,
            metadata: { pruned: count || 0 }
        });

        return NextResponse.json({ 
            success: true, 
            message: `Successfully pruned ${count || 0} old read notifications from the database.` 
        });

    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
