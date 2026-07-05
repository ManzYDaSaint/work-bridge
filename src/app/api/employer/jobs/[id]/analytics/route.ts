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

        // 2. Get total applications
        const { count: totalApplications } = await supabase
            .from("applications")
            .select("*", { count: "exact", head: true })
            .eq("job_id", jobId);

        // 3. Get total views
        const { count: totalViews } = await supabase
            .from("job_views")
            .select("*", { count: "exact", head: true })
            .eq("job_id", jobId);

        // 4. Get chart data (Views per day for the last 14 days)
        // Using PostgreSQL date_trunc to group by day
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
        
        // Initialize last 14 days with 0
        for (let i = 13; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD
            dailyViews[dateStr] = 0;
        }

        // Count views per day
        if (rawViews) {
            rawViews.forEach((view) => {
                const dateStr = new Date(view.created_at).toISOString().split("T")[0];
                if (dailyViews[dateStr] !== undefined) {
                    dailyViews[dateStr]++;
                }
            });
        }

        // Convert to array format suitable for Recharts or similar charting libraries
        const chartData = Object.keys(dailyViews).map(date => ({
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            views: dailyViews[date],
        }));

        return NextResponse.json({
            jobId,
            totalViews: totalViews || 0,
            totalApplications: totalApplications || 0,
            conversionRate: totalViews ? Math.round(((totalApplications || 0) / totalViews) * 100) : 0,
            chartData,
        });

    } catch (error: any) {
        console.error("Analytics fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
    }
}, ["EMPLOYER"]);
