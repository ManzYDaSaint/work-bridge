import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { recordAuditLog } from "@/lib/audit";
import { emitSystemEvent } from "@/lib/mission-control";

export async function POST(request: Request) {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
        return NextResponse.json({ error: "Admin client unavailable" }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { userId, seekerId: providedSeekerId, action, durationMonths = 1 } = body;

        if (!userId || !action) {
            return NextResponse.json({ error: "userId and action are required" }, { status: 400 });
        }

        let seekerId = providedSeekerId;

        // If seekerId not supplied, fetch from job_seekers table
        if (!seekerId) {
            const { data: seeker } = await supabase
                .from("job_seekers")
                .select("id")
                .eq("user_id", userId)
                .single();
            seekerId = seeker?.id;
        }

        if (action === "GRANT") {
            const endsAt = new Date();
            endsAt.setMonth(endsAt.getMonth() + Number(durationMonths || 1));

            if (seekerId) {
                // Upsert into premium_subscriptions
                const { error: subErr } = await supabase.from("premium_subscriptions").upsert({
                    seeker_id: seekerId,
                    status: "ACTIVE",
                    ends_at: endsAt.toISOString(),
                    payment_provider: "ADMIN_MANUAL",
                    payment_reference: `MANUAL_ADMIN_${Date.now()}`
                }, { onConflict: "seeker_id" });

                if (subErr) {
                    console.error("Admin premium_subscriptions upsert error:", subErr);
                }
            }

            // Update user plan to PREMIUM
            await supabase.from("users").update({ plan: "PREMIUM" }).eq("id", userId);

            await recordAuditLog({
                action: "subscription_GRANT_PREMIUM",
                path: "/api/admin/subscriptions",
                method: "POST",
                statusCode: 200,
                userId: auth.user.id,
                metadata: { targetUserId: userId, seekerId, durationMonths, endsAt: endsAt.toISOString() }
            });

            await emitSystemEvent({
                category: "USER",
                severity: "SUCCESS",
                event: "ADMIN_PREMIUM_GRANTED",
                message: `Admin granted ${durationMonths} month(s) Premium to user ${userId}`,
                actorId: auth.user.id,
                metadata: { targetUserId: userId, seekerId, durationMonths }
            });

            return NextResponse.json({
                success: true,
                message: `Premium granted for ${durationMonths} month(s)`,
                endsAt: endsAt.toISOString()
            });

        } else if (action === "REVOKE") {
            const nowIso = new Date().toISOString();

            if (seekerId) {
                await supabase
                    .from("premium_subscriptions")
                    .update({ status: "CANCELLED", ends_at: nowIso })
                    .eq("seeker_id", seekerId);
            }

            // Reset user plan to FREE
            await supabase.from("users").update({ plan: "FREE" }).eq("id", userId);

            await recordAuditLog({
                action: "subscription_REVOKE_PREMIUM",
                path: "/api/admin/subscriptions",
                method: "POST",
                statusCode: 200,
                userId: auth.user.id,
                metadata: { targetUserId: userId, seekerId }
            });

            await emitSystemEvent({
                category: "USER",
                severity: "WARNING",
                event: "ADMIN_PREMIUM_REVOKED",
                message: `Admin revoked Premium status for user ${userId}`,
                actorId: auth.user.id,
                metadata: { targetUserId: userId, seekerId }
            });

            return NextResponse.json({
                success: true,
                message: "Premium subscription revoked"
            });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error: any) {
        console.error("Admin subscription action error:", error);
        return NextResponse.json({ error: error.message || "Failed to update subscription" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
