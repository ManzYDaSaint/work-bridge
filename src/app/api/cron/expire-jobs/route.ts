import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Resend } from "resend";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    // Authenticate Vercel Cron
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const supabase = await createSupabaseServerClient();
        const today = new Date().toISOString().split('T')[0];

        // Expire jobs where the deadline has passed
        const { data: expiredJobs, error } = await supabase
            .from("jobs")
            .update({ status: 'EXPIRED' })
            .eq('status', 'ACTIVE')
            .lt('deadline', today)
            .select(`
                id, 
                title, 
                employer:employers(company_name, users(email))
            `);

        if (error) {
            console.error("[CRON] Expire Jobs error:", error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        // Optional: We could email the employers here notifying them their job has expired.
        if (expiredJobs && expiredJobs.length > 0 && process.env.RESEND_API_KEY) {
            const resend = new Resend(process.env.RESEND_API_KEY);
            for (const job of expiredJobs) {
                const email = (job.employer as any)?.users?.email;
                if (email) {
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
                }
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: `Successfully expired ${expiredJobs?.length || 0} jobs.`,
        });

    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
