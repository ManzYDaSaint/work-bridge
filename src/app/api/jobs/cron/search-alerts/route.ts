import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { sendJobAlertEmail } from "@/lib/resend";
import { validateCronRequest } from "@/lib/cron-auth";

/**
 * CRON JOB: Process Job Alerts
 * Runs daily. Checks for users with job alerts who are due for an update
 * (e.g., daily alerts run every day, weekly alerts run if 7 days passed).
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
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

        // 1. Fetch alerts that are due
        // For DAILY, last_run_at must be < oneDayAgo
        // For WEEKLY, last_run_at must be < sevenDaysAgo
        const { data: alerts, error } = await supabase
            .from("job_alerts")
            .select(`
                id,
                user_id,
                keywords,
                location,
                job_type,
                work_mode,
                frequency,
                last_run_at,
                users (email)
            `)
            .or(`and(frequency.eq.DAILY,last_run_at.lt.${oneDayAgo}),and(frequency.eq.WEEKLY,last_run_at.lt.${sevenDaysAgo})`);

        if (error) throw error;
        
        if (!alerts || alerts.length === 0) {
            return NextResponse.json({ success: true, message: "No alerts due for processing." });
        }

        const processedAlerts = [];

        for (const alert of alerts) {
            const userEmail = (alert.users as any)?.email;
            if (!userEmail) continue;

            // Build query to find matching ACTIVE jobs posted SINCE the last alert run
            let query = supabase
                .from("jobs")
                .select("id, title, location, type, work_mode, employer:employers(company_name)")
                .eq("status", "ACTIVE")
                .gt("created_at", alert.last_run_at || sevenDaysAgo);

            if (alert.keywords) {
                // simple search on title or description using ilike
                query = query.or(`title.ilike.%${alert.keywords}%,description.ilike.%${alert.keywords}%`);
            }
            if (alert.location) {
                query = query.ilike("location", `%${alert.location}%`);
            }
            if (alert.job_type) {
                query = query.eq("type", alert.job_type);
            }
            if (alert.work_mode) {
                query = query.eq("work_mode", alert.work_mode);
            }

            const { data: matches } = await query.limit(5); // limit to top 5 matches

            if (matches && matches.length > 0) {
                console.log(`[JOB_ALERT] Found ${matches.length} matches for user ${alert.user_id}`);
                
                await sendJobAlertEmail(userEmail, {
                    seekerName: "Aganyu User",
                    matchedJobs: matches as any
                });
                
                // Update the alert's last_run_at
                await supabase
                    .from("job_alerts")
                    .update({ last_run_at: now.toISOString() })
                    .eq("id", alert.id);
                    
                processedAlerts.push(alert.id);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${processedAlerts.length} job alerts.`,
            alertIds: processedAlerts
        });
    } catch (error: any) {
        console.error("Cron Job alerts error:", error);
        return NextResponse.json({ error: "Failed to process search alerts" }, { status: 500 });
    }
}
