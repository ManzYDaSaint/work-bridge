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
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "20", 10);
        const channel = searchParams.get("channel") || "ALL"; // ALL | WHATSAPP | EMAIL

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        // Build base query for dispatched matches from notification_queue
        let query = supabase
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
            `, { count: "exact" });

        if (channel === "WHATSAPP") {
            query = query.or("template_id.eq.aganyu_job_match_alert_v1,payload->>channel.neq.EMAIL");
        } else if (channel === "EMAIL") {
            query = query.or("template_id.eq.standard_email_job_alert,payload->>channel.eq.EMAIL");
        }

        const { data: dispatches, count, error } = await query
            .order("created_at", { ascending: false })
            .range(from, to);

        if (error) {
            console.error("[Admin Dispatches API] DB Error:", error);
        }

        // Fetch overall stats for telemetry header cards
        const { data: allStats, error: statsError } = await supabase
            .from("notification_queue")
            .select("status, template_id, payload");

        let sentCount = 0;
        let pendingCount = 0;
        let failedCount = 0;
        let whatsappCount = 0;
        let emailCount = 0;
        let totalDispatched = 0;

        if (allStats) {
            totalDispatched = allStats.length;
            allStats.forEach(i => {
                if (i.status === "SENT") sentCount++;
                else if (i.status === "PENDING") pendingCount++;
                else if (i.status === "FAILED") failedCount++;

                const isEmail = i.template_id === "standard_email_job_alert" || (i.payload as any)?.channel === "EMAIL";
                if (isEmail) emailCount++;
                else whatsappCount++;
            });
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
        const totalItems = count ?? totalDispatched;
        const totalPages = Math.ceil(totalItems / limit) || 1;

        return NextResponse.json({
            totalDispatched,
            sentCount,
            pendingCount,
            failedCount,
            whatsappCount,
            emailCount,
            dispatches: items,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages,
            },
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
