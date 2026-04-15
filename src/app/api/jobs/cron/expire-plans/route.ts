import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    // Basic authorization for cron requests
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();

    try {
        const now = new Date().toISOString();

        // Find and update all employers whose PREMIUM plan has expired
        const { data, error } = await supabase
            .from("employers")
            .update({ plan: 'FREE', plan_expires_at: null })
            .eq("plan", "PREMIUM")
            .lte("plan_expires_at", now)
            .select("id");

        if (error) {
            console.error("Error expiring plans:", error);
            return NextResponse.json({ error: "Failed to expire plans" }, { status: 500 });
        }

        // Mark subscriptions ledger as EXPIRED
        if (data && data.length > 0) {
            await supabase
                .from("subscriptions")
                .update({ status: 'EXPIRED' })
                .eq("status", "ACTIVE")
                .lte("end_date", now);
        }

        return NextResponse.json({
            success: true,
            expiredCount: data?.length || 0
        });
    } catch (error) {
        console.error("Cron error expiring plans:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
