import { createSupabaseServerClient } from "@/lib/supabase-server";
import { withAuth } from "@/lib/auth-guard";
import { NextResponse } from "next/server";

export const GET = withAuth(async (request, auth, context: { params: Promise<{ id: string }> }) => {
    const supabase = await createSupabaseServerClient();
    const { id: jobId } = await context.params;

    if (!jobId) {
        return NextResponse.json({ error: "Job ID required" }, { status: 400 });
    }

    try {
        // 1. Verify ownership
        const { data: job, error: jobError } = await supabase
            .from("jobs")
            .select("id, employer_id")
            .eq("id", jobId)
            .single();

        if (jobError || !job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        if (job.employer_id !== auth.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // 2. Get applications breakdown
        const { data: apps, error: appsError } = await supabase
            .from("applications")
            .select("id, status, is_guest_application, rejection_reason, created_at, viewed_at")
            .eq("job_id", jobId);

        if (appsError) throw appsError;

        const totalApplications = apps?.length || 0;

        // Stage Funnel Breakdown (Workable/Greenhouse ATS Funnel)
        const stageCounts = {
            applied: totalApplications,
            shortlisted: apps?.filter(a => a.status === "SHORTLISTED" || a.status === "INTERVIEWING" || a.status === "ACCEPTED").length || 0,
            interviewing: apps?.filter(a => a.status === "INTERVIEWING" || a.status === "ACCEPTED").length || 0,
            hired: apps?.filter(a => a.status === "ACCEPTED").length || 0,
            rejected: apps?.filter(a => a.status === "REJECTED").length || 0,
        };

        // Rejection reasons aggregation
        const rejectionMap: Record<string, number> = {};
        apps?.filter(a => a.status === "REJECTED" && a.rejection_reason).forEach(a => {
            const reason = a.rejection_reason;
            rejectionMap[reason] = (rejectionMap[reason] || 0) + 1;
        });

        const rejectionReasons = Object.entries(rejectionMap).map(([reason, count]) => ({
            reason,
            count
        })).sort((a, b) => b.count - a.count);

        const guestApplicationsCount = apps?.filter(a => a.is_guest_application).length || 0;

        // 3. Get total views
        const { count: totalViews } = await supabase
            .from("job_views")
            .select("*", { count: "exact", head: true })
            .eq("job_id", jobId);

        // 4. Get chart data (Views per day for the last 14 days)
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const { data: rawViews, error: viewsError } = await supabase
            .from("job_views")
            .select("created_at")
            .eq("job_id", jobId)
            .gte("created_at", fourteenDaysAgo.toISOString());

        if (viewsError) throw viewsError;

        // Process data into a daily map
        const dailyViews: Record<string, number> = {};
        
        for (let i = 13; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split("T")[0];
            dailyViews[dateStr] = 0;
        }

        if (rawViews) {
            rawViews.forEach((view) => {
                const dateStr = new Date(view.created_at).toISOString().split("T")[0];
                if (dailyViews[dateStr] !== undefined) {
                    dailyViews[dateStr]++;
                }
            });
        }

        const chartData = Object.keys(dailyViews).map(date => ({
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            views: dailyViews[date],
        }));

        return NextResponse.json({
            jobId,
            totalViews: totalViews || 0,
            totalApplications,
            guestApplicationsCount,
            conversionRate: totalViews ? Math.round((totalApplications / totalViews) * 100) : 0,
            stageCounts,
            rejectionReasons,
            chartData,
        });

    } catch (error: any) {
        console.error("Analytics fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
    }
}, ["EMPLOYER"]);


export const dynamic = "force-dynamic";
