import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { emitSystemEvent } from "@/lib/mission-control";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const authHeader = req.headers.get("authorization");
    if (
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: "No DB client" }, { status: 500 });

    try {
        let queuedCount = 0;
        const now = new Date();

        // 1. Incomplete Profile Reminders for Seekers
        // Seekers with completion < 80, created > 2 days ago, and haven't received reminder in last 30 days
        const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: seekersForProfile } = await supabase
            .from('job_seekers')
            .select('id, full_name, completion, users!inner(email, last_profile_reminder_at, created_at)')
            .lt('completion', 80)
            .lt('users.created_at', twoDaysAgo)
            .or(`last_profile_reminder_at.is.null,last_profile_reminder_at.lt.${thirtyDaysAgo}`, { foreignTable: 'users' });

        if (seekersForProfile) {
            for (const seeker of seekersForProfile) {
                const user = (seeker.users as any);
                if (!user.email) continue;
                
                await supabase.from('automation_tasks').insert({
                    plugin_id: 'email-notifier',
                    payload: {
                        templateId: 'INCOMPLETE_PROFILE',
                        to: user.email,
                        context: { seekerName: seeker.full_name || 'Candidate', completion: seeker.completion || 0 }
                    },
                    priority: 'MEDIUM',
                });
                
                await supabase.from('users').update({ last_profile_reminder_at: now.toISOString() }).eq('id', seeker.id);
                queuedCount++;
            }
        }

        // 2. Seeker Come Back Reminders
        // Seekers inactive for 14 days, haven't received reminder in 30 days
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: seekersForComeBack } = await supabase
            .from('job_seekers')
            .select('id, full_name, viewed_at, users!inner(email, last_inactivity_reminder_at)')
            .or(`viewed_at.is.null,viewed_at.lt.${fourteenDaysAgo}`)
            .or(`last_inactivity_reminder_at.is.null,last_inactivity_reminder_at.lt.${thirtyDaysAgo}`, { foreignTable: 'users' });

        if (seekersForComeBack) {
            for (const seeker of seekersForComeBack) {
                const user = (seeker.users as any);
                if (!user.email) continue;
                
                await supabase.from('automation_tasks').insert({
                    plugin_id: 'email-notifier',
                    payload: {
                        templateId: 'SEEKER_COME_BACK',
                        to: user.email,
                        context: { seekerName: seeker.full_name || 'Candidate' }
                    },
                    priority: 'MEDIUM',
                });
                
                await supabase.from('users').update({ last_inactivity_reminder_at: now.toISOString() }).eq('id', seeker.id);
                queuedCount++;
            }
        }

        // 3. Employer Come Back Reminders
        // Employers inactive for 30 days, haven't received reminder in 45 days
        const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: employersForComeBack } = await supabase
            .from('employers')
            .select('id, company_name, viewed_at, users!inner(email, last_inactivity_reminder_at)')
            .or(`viewed_at.is.null,viewed_at.lt.${thirtyDaysAgo}`)
            .or(`last_inactivity_reminder_at.is.null,last_inactivity_reminder_at.lt.${fortyFiveDaysAgo}`, { foreignTable: 'users' });

        if (employersForComeBack) {
            for (const employer of employersForComeBack) {
                const user = (employer.users as any);
                if (!user.email) continue;
                
                await supabase.from('automation_tasks').insert({
                    plugin_id: 'email-notifier',
                    payload: {
                        templateId: 'EMPLOYER_COME_BACK',
                        to: user.email,
                        context: { companyName: employer.company_name || 'Employer' }
                    },
                    priority: 'MEDIUM',
                });
                
                await supabase.from('users').update({ last_inactivity_reminder_at: now.toISOString() }).eq('id', employer.id);
                queuedCount++;
            }
        }

        if (queuedCount > 0) {
            await emitSystemEvent({
                category: "AUTOMATION",
                severity: "INFO",
                event: "RETENTION_REMINDERS_QUEUED",
                message: `Queued ${queuedCount} retention reminder emails`,
                metadata: { count: queuedCount }
            });
        }

        return NextResponse.json({ success: true, queuedCount });
    } catch (err: any) {
        console.error("[CRON] queue-retention-reminders error:", err);
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}
