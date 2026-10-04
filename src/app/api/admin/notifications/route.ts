import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { processNotificationQueue } from "@/lib/notification/worker";
import { recordAuditLog } from "@/lib/audit";
import { emitSystemEvent } from "@/lib/mission-control";
import { runJobMatchingOrchestration } from "@/lib/notification/orchestrator";

export async function GET(request: Request) {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
        return NextResponse.json({ error: "Admin database client unavailable" }, { status: 500 });
    }

    try {
        // Fetch all dispatched matches from notification_queue ordered by created_at desc
        const { data: dispatches, error } = await supabase
            .from("notification_queue")
            .select(`
                id,
                created_at,
                status,
                template_id,
                payload,
                last_error,
                attempts,
                job_seekers (
                    id,
                    full_name,
                    qualification,
                    phone
                ),
                jobs (
                    id,
                    title,
                    display_company_name,
                    qualification,
                    minimum_years_experience
                )
            `)
            .order("created_at", { ascending: false })
            .limit(100);

        if (error) {
            console.error("[Admin Dispatches API] DB Error:", error);
        }

        // System telemetry for stats UI
        const { count: activeJobsCount } = await supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "ACTIVE");
        const { count: activeSeekersCount } = await supabase.from("job_seekers").select("id", { count: "exact", head: true });
        
        const nowIso = new Date().toISOString();
        const { count: premiumSeekersCount } = await supabase
            .from("premium_subscriptions")
            .select("seeker_id", { count: "exact", head: true })
            .eq("status", "ACTIVE")
            .gt("ends_at", nowIso);

        const items = dispatches || [];
        const totalDispatched = items.length;
        const sentCount = items.filter(i => i.status === "SENT").length;
        const pendingCount = items.filter(i => i.status === "PENDING").length;
        const failedCount = items.filter(i => i.status === "FAILED").length;
        
        const whatsappCount = items.filter(i => i.template_id === "aganyu_job_match_alert_v1" || (i.payload as any)?.channel !== "EMAIL").length;
        const emailCount = items.filter(i => i.template_id === "standard_email_job_alert" || (i.payload as any)?.channel === "EMAIL").length;

        return NextResponse.json({
            totalDispatched,
            sentCount,
            pendingCount,
            failedCount,
            whatsappCount,
            emailCount,
            dispatches: items,
            diagnostics: {
                activeJobs: activeJobsCount || 0,
                activeSeekers: activeSeekersCount || 0,
                premiumSeekers: premiumSeekersCount || 0
            }
        });

    } catch (error: any) {
        console.error("[Admin Dispatches API] Fetch error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch dispatched matches" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
        return NextResponse.json({ error: "Admin database client unavailable" }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { action, notificationId, notificationIds } = body;

        // Manual trigger matching run
        if (action === "TRIGGER_MATCHING") {
            runJobMatchingOrchestration().catch(err => console.error("Manual matching error:", err));
            return NextResponse.json({ success: true, message: "Matching & automated dispatch orchestration started in background." });
        }

        // Requeue failed notifications for retry
        if (action === "REQUEUE") {
            const targetIds = notificationIds || (notificationId ? [notificationId] : []);
            if (targetIds.length === 0) {
                return NextResponse.json({ error: "No notification ID provided" }, { status: 400 });
            }

            await supabase
                .from("notification_queue")
                .update({ status: "PENDING", attempts: 0, last_error: null })
                .in("id", targetIds);

            await processNotificationQueue();

            await recordAuditLog({
                action: "notification_REQUEUE",
                path: "/api/admin/notifications",
                method: "POST",
                statusCode: 200,
                userId: auth.user.id,
                metadata: { requeuedCount: targetIds.length, targetIds }
            });

            return NextResponse.json({ success: true, message: `Requeued ${targetIds.length} notification(s) for retry.` });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error: any) {
        console.error("[Admin Dispatches API] Action error:", error);
        return NextResponse.json({ error: error.message || "Failed to process action" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
