import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { Resend } from "resend";
import { emitSystemEvent } from "@/lib/mission-control";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    // Authenticate Vercel Cron
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        await emitSystemEvent({
            category: "JOB",
            severity: "INFO",
            event: "EXPIRE_JOBS_CRON_STARTED",
            message: "Expire jobs cron started",
            metadata: {}
        });

        const supabase = getSupabaseAdminClient();
        if (!supabase) {
            return NextResponse.json({ success: false, error: "Database admin client unavailable" }, { status: 500 });
        }

        const today = new Date().toISOString().split('T')[0];

        // 1. Expire jobs where the deadline has passed
        const { data: expiredJobs, error } = await supabase
            .from("jobs")
            .update({ status: 'EXPIRED' })
            .eq('status', 'ACTIVE')
            .lt('deadline', today)
            .select("id, title, employer_id");

        if (error) {
            console.error("[CRON] Expire Jobs error:", error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        // Email employers notifying them their job has expired
        if (expiredJobs && expiredJobs.length > 0 && process.env.RESEND_API_KEY) {
            const resend = new Resend(process.env.RESEND_API_KEY);
            const employerIds = Array.from(new Set(expiredJobs.map((j) => j.employer_id).filter(Boolean)));

            if (employerIds.length > 0) {
                const { data: usersData } = await supabase
                    .from("users")
                    .select("id, email")
                    .in("id", employerIds);

                const userEmailMap = new Map((usersData || []).map((u) => [u.id, u.email]));

                for (const job of expiredJobs) {
                    const email = userEmailMap.get(job.employer_id);
                    if (email) {
                        try {
                            await resend.emails.send({
                                from: "Aganyu Updates <no-reply@aganyu.com>",
                                to: email,
                                subject: `Job Posting Expired: ${job.title}`,
                                html: `
                                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                                        <h2>Your Job Posting has Expired</h2>
                                        <p>Hello,</p>
                                        <p>This is an automated notice that your job posting for <strong>${job.title}</strong> has reached its deadline and has been automatically marked as <strong>EXPIRED</strong>.</p>
                                        <p>Candidates can no longer apply for this role. If you are still hiring for this position, you can log into your dashboard and extend the deadline to reactivate the job.</p>
                                        <p>Best regards,<br>The Aganyu Team</p>
                                    </div>
                                `
                            });
                        } catch (emailErr) {
                            console.error(`[CRON] Failed to send expiration email for job ${job.id}:`, emailErr);
                        }
                    }
                }
            }
        }

        // 2. Expire opportunities where the deadline has passed
        const { sweepExpiredOpportunities } = await import("@/services/opportunityService");
        const opportunitySweep = await sweepExpiredOpportunities();

        await emitSystemEvent({
            category: "JOB",
            severity: "SUCCESS",
            event: "EXPIRE_JOBS_CRON_COMPLETED",
            message: `Expired ${expiredJobs?.length || 0} jobs and processed ${opportunitySweep.processed} opportunities`,
            metadata: { expiredJobs: expiredJobs?.length || 0, opportunitiesProcessed: opportunitySweep.processed }
        });

        return NextResponse.json({ 
            success: true, 
            message: `Successfully expired ${expiredJobs?.length || 0} jobs and ${opportunitySweep.processed} opportunities.`,
            expiredJobsCount: expiredJobs?.length || 0,
            expiredOpportunitiesCount: opportunitySweep.processed
        });

    } catch (err: any) {
        console.error("[CRON] Expire jobs cron caught error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

