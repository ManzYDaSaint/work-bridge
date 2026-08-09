import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { sendJobExpirationAlertEmail } from "@/lib/resend";
import { validateCronRequest } from "@/lib/cron-auth";
import { emitSystemEvent } from "@/lib/mission-control";

/**
 * CRON JOB: Send Job Expiration Alerts
 * Runs daily to notify employers of listings expiring in the next 48 hours.
 */
export async function GET(request: Request) {
    const cronValidation = validateCronRequest(request);
    if (cronValidation) return cronValidation;

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    try {
        const now = new Date();
        const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
        const nowIso = now.toISOString();

        // 1. Fetch jobs expiring within 48h that haven't received an alert recently
        const { data: jobs, error } = await supabase
            .from("jobs")
            .select(`
                id,
                title,
                deadline,
                employer:employers(id, company_name)
            `)
            .eq("status", 'ACTIVE')
            .lt("deadline", fortyEightHoursFromNow)
            .gt("deadline", nowIso)
            .is("last_alert_sent_at", null); // Only send if never sent before

        if (error) throw error;

        const sentAlerts = [];

        for (const job of (jobs || [])) {
            // Fetch employer email
            const { data: employerUser } = await supabase
                .from("users")
                .select("email")
                .eq("id", (job.employer as any).id)
                .single();

            if (employerUser?.email) {
                await sendJobExpirationAlertEmail(employerUser.email, {
                    companyName: (job.employer as any).companyName || (job.employer as any).company_name,
                    jobTitle: job.title,
                    jobId: job.id,
                    expiryDate: new Date(job.deadline).toLocaleDateString()
                });

                // Mark alert as sent
                await supabase
                    .from("jobs")
                    .update({ last_alert_sent_at: nowIso })
                    .eq("id", job.id);

                sentAlerts.push(job.id);
            }
        }

        await emitSystemEvent({
            category: "NOTIFICATION",
            severity: "SUCCESS",
            event: "JOB_EXPIRATION_ALERTS_SENT",
            message: `Sent expiration alerts for ${sentAlerts.length} jobs.`,
            metadata: { sentAlerts: sentAlerts.length, jobIds: sentAlerts }
        });

        await emitSystemEvent({
            category: "NOTIFICATION",
            severity: "SUCCESS",
            event: "JOB_EXPIRATION_ALERTS_SENT",
            message: `Sent expiration alerts for ${sentAlerts.length} jobs.`,
            metadata: { sentAlerts: sentAlerts.length, jobIds: sentAlerts }
        });

        return NextResponse.json({
            success: true,
            message: `Sent expiration alerts for ${sentAlerts.length} jobs.`,
            jobIds: sentAlerts
        });
    } catch (error: any) {
        console.error("Cron Job alerts error:", error);
        await emitSystemEvent({
            category: "NOTIFICATION",
            severity: "WARNING",
            event: "JOB_EXPIRATION_ALERTS_FAILED",
            message: "Job expiration alert cron failed.",
            metadata: { error: error.message }
        });
        return NextResponse.json({ error: "Failed to send alerts" }, { status: 500 });
    }
}
