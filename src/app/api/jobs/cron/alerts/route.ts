import { createSupabaseServerClient } from "@/lib/supabase-server";
import { sendJobExpirationAlertEmail } from "@/lib/resend";
import { NextResponse } from "next/server";

/**
 * CRON JOB: Send Job Expiration Alerts
 * Runs daily to notify employers of listings expiring in the next 48 hours.
 */
export async function GET(request: Request) {
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();

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

        return NextResponse.json({
            success: true,
            message: `Sent expiration alerts for ${sentAlerts.length} jobs.`,
            jobIds: sentAlerts
        });
    } catch (error: any) {
        console.error("Cron Job alerts error:", error);
        return NextResponse.json({ error: "Failed to send alerts" }, { status: 500 });
    }
}
