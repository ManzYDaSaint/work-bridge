import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getMatchDispatchMode, setMatchDispatchMode } from "@/lib/notification/settings";
import { processNotificationQueue } from "@/lib/notification/worker";
import { recordAuditLog } from "@/lib/audit";
import { emitSystemEvent } from "@/lib/mission-control";

export async function GET(request: Request) {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
        return NextResponse.json({ error: "Admin database client unavailable" }, { status: 500 });
    }

    try {
        const dispatchMode = await getMatchDispatchMode();

        // 1. Fetch pending approvals (status = 'REQUIRES_APPROVAL')
        const { data: requiresApproval } = await supabase
            .from("notification_queue")
            .select(`
                id,
                created_at,
                status,
                template_id,
                payload,
                job_seekers (
                    id,
                    full_name,
                    qualification,
                    experience,
                    skills,
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
            .eq("status", "REQUIRES_APPROVAL")
            .order("created_at", { ascending: false });

        // 2. Fetch recently processed notifications (SENT, FAILED, REJECTED)
        const { data: recentHistory } = await supabase
            .from("notification_queue")
            .select(`
                id,
                created_at,
                status,
                template_id,
                payload,
                job_seekers ( full_name, phone ),
                jobs ( title, display_company_name )
            `)
            .in("status", ["SENT", "FAILED", "REJECTED", "PENDING"])
            .order("created_at", { ascending: false })
            .limit(30);

        // Counts
        const pendingCount = requiresApproval?.length || 0;
        const sentCount = recentHistory?.filter(h => h.status === "SENT").length || 0;
        const rejectedCount = recentHistory?.filter(h => h.status === "REJECTED").length || 0;

        return NextResponse.json({
            dispatchMode,
            pendingCount,
            sentCount,
            rejectedCount,
            requiresApproval: requiresApproval || [],
            recentHistory: recentHistory || []
        });

    } catch (error: any) {
        console.error("[Admin Notifications API] Fetch error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch notification queue" }, { status: 500 });
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
        const { action, notificationId, notificationIds, dispatchMode, minScore = 80 } = body;

        // Mode settings update
        if (action === "SET_MODE" && dispatchMode) {
            await setMatchDispatchMode(dispatchMode);
            await recordAuditLog({
                action: "notification_UPDATE_DISPATCH_MODE",
                path: "/api/admin/notifications",
                method: "POST",
                statusCode: 200,
                userId: auth.user.id,
                metadata: { dispatchMode }
            });

            return NextResponse.json({ success: true, dispatchMode });
        }

        // Approve single or batch
        if (action === "APPROVE") {
            let targetIds: string[] = [];

            if (notificationIds && Array.isArray(notificationIds)) {
                targetIds = notificationIds;
            } else if (notificationId) {
                targetIds = [notificationId];
            } else if (body.approveHighScores) {
                // Bulk approve matches with matchScore >= minScore
                const { data } = await supabase
                    .from("notification_queue")
                    .select("id, payload")
                    .eq("status", "REQUIRES_APPROVAL");

                targetIds = (data || [])
                    .filter((item: any) => (item.payload?.matchScore || 0) >= minScore)
                    .map((item: any) => item.id);
            }

            if (targetIds.length === 0) {
                return NextResponse.json({ error: "No notifications selected for approval" }, { status: 400 });
            }

            // Update status to PENDING
            await supabase
                .from("notification_queue")
                .update({ status: "PENDING" })
                .in("id", targetIds);

            // Process immediately
            await processNotificationQueue();

            await recordAuditLog({
                action: "notification_APPROVE_DISPATCH",
                path: "/api/admin/notifications",
                method: "POST",
                statusCode: 200,
                userId: auth.user.id,
                metadata: { approvedCount: targetIds.length, targetIds }
            });

            await emitSystemEvent({
                category: "NOTIFICATION",
                severity: "SUCCESS",
                event: "ADMIN_NOTIFICATION_APPROVED",
                message: `Admin approved ${targetIds.length} WhatsApp job notification(s)`,
                actorId: auth.user.id,
                metadata: { approvedCount: targetIds.length }
            });

            return NextResponse.json({
                success: true,
                message: `Approved and queued ${targetIds.length} notification(s) for WhatsApp delivery.`,
                approvedCount: targetIds.length
            });
        }

        // Reject match
        if (action === "REJECT") {
            const targetIds = notificationIds || (notificationId ? [notificationId] : []);
            if (targetIds.length === 0) {
                return NextResponse.json({ error: "No notification ID provided" }, { status: 400 });
            }

            await supabase
                .from("notification_queue")
                .update({ status: "REJECTED" })
                .in("id", targetIds);

            await recordAuditLog({
                action: "notification_REJECT_MATCH",
                path: "/api/admin/notifications",
                method: "POST",
                statusCode: 200,
                userId: auth.user.id,
                metadata: { rejectedCount: targetIds.length, targetIds }
            });

            return NextResponse.json({
                success: true,
                message: `Rejected ${targetIds.length} match notification(s).`
            });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error: any) {
        console.error("[Admin Notifications API] Action error:", error);
        return NextResponse.json({ error: error.message || "Failed to process approval action" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
