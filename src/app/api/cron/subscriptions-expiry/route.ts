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

        // 3. Mark expired seekers as no longer premium on the current schema
        const { data: seekers } = await supabase
            .from("job_seekers")
            .select("id")
            .in("id", seekerIds);

        if (seekers && seekers.length > 0) {
            const seekerIdsToClear = seekers.map((s) => s.id).filter(Boolean);
            if (seekerIdsToClear.length > 0) {
                await supabase
                    .from("job_seekers")
                    .update({ is_subscribed: false })
                    .in("id", seekerIdsToClear);
            }
        }

        // 5. Expire Employer PRO subscriptions past their plan_expires_at date
        const { data: expiredEmployers } = await supabase
            .from("employers")
            .select("id, company_name")
            .eq("plan", "PRO")
            .lt("plan_expires_at", now);

        let expiredEmployersCount = 0;
        if (expiredEmployers && expiredEmployers.length > 0) {
            const empIdsToRevert = expiredEmployers.map((e) => e.id);
            const { error: empRevertErr } = await supabase
                .from("employers")
                .update({ 
                    plan: "FREE",
                    plan_expires_at: null 
                })
                .in("id", empIdsToRevert);

            if (!empRevertErr) {
                expiredEmployersCount = empIdsToRevert.length;
            } else {
                console.error("[Subscription Expiry Cron] Error reverting employers to FREE:", empRevertErr);
            }
        }

        // 6. Emit audit log and system event
        await emitSystemEvent({
            category: "SYSTEM",
            severity: "INFO",
            event: "SUBSCRIPTIONS_EXPIRED_BATCH",
            message: `Expired ${expiredSubs.length} seeker subscriptions & ${expiredEmployersCount} employer PRO subscriptions`,
            actorId: "CRON",
            metadata: { count: expiredSubs.length, seekerIds, expiredEmployersCount }
        });

        return NextResponse.json({
            success: true,
            processedSeekers: expiredSubs.length,
            processedEmployers: expiredEmployersCount,
            message: `Successfully expired ${expiredSubs.length} seeker sub(s) & reverted ${expiredEmployersCount} employer(s) to FREE plan.`
        });

    } catch (error: any) {
        console.error("[Subscription Expiry Cron Error]:", error);
        return NextResponse.json({ error: error.message || "Cron execution failed" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
