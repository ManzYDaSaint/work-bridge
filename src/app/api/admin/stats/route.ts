import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export async function GET() {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();
    const adminClient = getSupabaseAdminClient();

    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const results = await Promise.all([
            // Core counts
            supabase.from("users").select("*", { count: "exact", head: true }),
            supabase.from("job_seekers").select("*", { count: "exact", head: true }),
            supabase.from("employers").select("*", { count: "exact", head: true }),
            supabase.from("jobs").select("*", { count: "exact", head: true }),
            supabase.from("applications").select("*", { count: "exact", head: true }),
            // Funnel events (admin key needed for RLS bypass)
            adminClient
                ? adminClient
                    .from("product_events")
                    .select("role, stage, user_id, session_id")
                    .gte("created_at", thirtyDaysAgo)
                : Promise.resolve({ data: [], error: null }),
            // Pending account close requests
            supabase.from("account_close_requests").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
            // Premium employers
            supabase.from("employers").select("*", { count: "exact", head: true }).eq("plan", "PREMIUM"),
            // Jobs pending moderation
            supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
            // 30-day user signup trend (daily buckets)
            supabase
                .from("users")
                .select("created_at")
                .gte("created_at", thirtyDaysAgo)
                .order("created_at", { ascending: true }),
        ]);

        const [
            usersRes, seekersRes, employersRes, jobsRes, appsRes,
            eventsRes,
            closeRequestsRes, premiumRes, pendingJobsRes,
            signupTrendRes,
        ] = results;

        const stats = [usersRes, seekersRes, employersRes, jobsRes, appsRes].map(r => (r as any).count || 0);
        const events = (eventsRes as any).data || [];

        // ── Funnel logic ──────────────────────────────────────────
        const funnelMap = new Map<string, Set<string>>();
        const stages = ["visit", "register", "onboarding", "apply", "hire"];

        const identityRoles = new Map<string, string>();
        events.forEach((event: any) => {
            const identity = event.user_id || event.session_id;
            if (identity && event.role && event.role !== "UNKNOWN") {
                identityRoles.set(identity, event.role);
            }
        });

        events.forEach((event: any) => {
            if (!event.stage) return;
            const identity = event.user_id || event.session_id;
            if (!identity) return;

            const role = identityRoles.get(identity) || event.role || "UNKNOWN";
            const key = `${role}:${event.stage}`;
            if (!funnelMap.has(key)) funnelMap.set(key, new Set());
            funnelMap.get(key)!.add(identity);

            const globalKey = `ALL:${event.stage}`;
            if (!funnelMap.has(globalKey)) funnelMap.set(globalKey, new Set());
            funnelMap.get(globalKey)!.add(identity);
        });

        // ── 30-day signup trend ───────────────────────────────────
        const signupRows: { created_at: string }[] = (signupTrendRes as any).data || [];
        const trendMap = new Map<string, number>();
        signupRows.forEach(row => {
            const day = row.created_at.slice(0, 10); // YYYY-MM-DD
            trendMap.set(day, (trendMap.get(day) || 0) + 1);
        });
        // Build last 30 days array (fill zeros for days with no signups)
        const signupTrend: { date: string; signups: number }[] = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            const day = d.toISOString().slice(0, 10);
            signupTrend.push({ date: day, signups: trendMap.get(day) || 0 });
        }

        return NextResponse.json({
            stats: {
                totalUsers: stats[0],
                totalSeekers: stats[1],
                totalEmployers: stats[2],
                totalJobs: stats[3],
                totalApplications: stats[4],
                // Moderation
                pendingCloseRequests: (closeRequestsRes as any).count || 0,
                premiumEmployers: (premiumRes as any).count || 0,
                pendingJobs: (pendingJobsRes as any).count || 0,
                // Funnel
                funnel30d: {
                    seekers: stages.map((stage) => ({
                        stage,
                        users: stage === "visit"
                            ? (funnelMap.get(`ALL:visit`)?.size || 0)
                            : (funnelMap.get(`JOB_SEEKER:${stage}`)?.size || 0),
                    })),
                    employers: stages.map((stage) => ({
                        stage,
                        users: stage === "visit"
                            ? (funnelMap.get(`ALL:visit`)?.size || 0)
                            : (funnelMap.get(`EMPLOYER:${stage}`)?.size || 0),
                    })),
                },
                // Trend
                signupTrend,
            }
        });
    } catch (error) {
        console.error("Admin stats fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
