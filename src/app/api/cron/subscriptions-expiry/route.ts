import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { recordAuditLog } from "@/lib/audit";
import { emitSystemEvent } from "@/lib/mission-control";

/**
 * Daily Cron job to clean up and manage subscription lifecycles
 * Run periodically (e.g. daily via Vercel Cron or external scheduler)
 */
export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized cron request" }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
        return NextResponse.json({ error: "Database client unavailable" }, { status: 500 });
    }

    try {
        const now = new Date().toISOString();

        // 1. Fetch active subscriptions that have passed their ends_at date
        const { data: expiredSubs, error: fetchErr } = await supabase
            .from("premium_subscriptions")
            .select("id, seeker_id, ends_at")
            .eq("status", "ACTIVE")
            .lt("ends_at", now);

        if (fetchErr) {
            throw new Error(`Failed to fetch expired subscriptions: ${fetchErr.message}`);
        }

        if (!expiredSubs || expiredSubs.length === 0) {
            return NextResponse.json({ success: true, processed: 0, message: "No subscriptions expired today." });
        }

        const seekerIds = expiredSubs.map((s) => s.seeker_id);

        // 2. Transition subscriptions to EXPIRED
        await supabase
            .from("premium_subscriptions")
            .update({ status: "EXPIRED" })
            .in("id", expiredSubs.map((s) => s.id));

        // 3. Downgrade user plan to FREE in users table
        const { data: seekers } = await supabase
            .from("job_seekers")
            .select("user_id")
            .in("id", seekerIds);

        if (seekers && seekers.length > 0) {
            const userIds = seekers.map((s) => s.user_id).filter(Boolean);
            if (userIds.length > 0) {
                await supabase
                    .from("users")
                    .update({ plan: "FREE" })
                    .in("id", userIds);
            }
        }

        // 4. Emit audit log and system event
        await emitSystemEvent({
            category: "SYSTEM",
            severity: "INFO",
            event: "SUBSCRIPTIONS_EXPIRED_BATCH",
            message: `Expired ${expiredSubs.length} premium subscriptions past ends_at date`,
            actorId: "CRON",
            metadata: { count: expiredSubs.length, seekerIds }
        });

        return NextResponse.json({
            success: true,
            processed: expiredSubs.length,
            message: `Successfully expired ${expiredSubs.length} subscription(s)`
        });

    } catch (error: any) {
        console.error("[Subscription Expiry Cron Error]:", error);
        return NextResponse.json({ error: error.message || "Cron execution failed" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
