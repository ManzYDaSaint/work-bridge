import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    // Authenticate Vercel Cron
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const supabase = await createSupabaseServerClient();
        
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

        return NextResponse.json({ 
            success: true, 
            message: `Successfully pruned ${count || 0} old read notifications from the database.` 
        });

    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
