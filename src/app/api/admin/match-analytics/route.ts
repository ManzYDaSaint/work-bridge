import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET() {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: "Admin client unavailable" }, { status: 500 });

    try {
        // Match precision stats from notification_queue
        const { data: allMatches } = await supabase
            .from("notification_queue")
            .select("id, status, payload, created_at")
            .order("created_at", { ascending: false })
            .limit(500);

        const matches = allMatches || [];

        // Score distribution buckets
        const buckets = { "50-60": 0, "60-70": 0, "70-80": 0, "80-90": 0, "90-100": 0 };
        let totalScore = 0, scoreCount = 0;

        matches.forEach(m => {
            const score = m.payload?.matchScore || 0;
            if (score >= 90) buckets["90-100"]++;
            else if (score >= 80) buckets["80-90"]++;
            else if (score >= 70) buckets["70-80"]++;
            else if (score >= 60) buckets["60-70"]++;
            else if (score >= 50) buckets["50-60"]++;
            if (score > 0) { totalScore += score; scoreCount++; }
        });

        const approved = matches.filter(m => m.status === "SENT" || m.status === "PENDING");
        const rejected = matches.filter(m => m.status === "REJECTED");
        const pending = matches.filter(m => m.status === "REQUIRES_APPROVAL");

        // Approval rate
        const reviewed = approved.length + rejected.length;
        const approvalRate = reviewed > 0 ? Math.round((approved.length / reviewed) * 100) : 0;
        const avgScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;

        // Recommendation: if 90%+ of approvals are >= 75%, suggest raising threshold
        const highApprovalShare = approved.filter(m => (m.payload?.matchScore || 0) >= 75).length;
        const suggestAutoAt75 = reviewed > 10 && approvalRate >= 90 && (highApprovalShare / (approved.length || 1)) >= 0.9;

        // Trend: last 7 days grouped by date
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const trendMap = new Map<string, { approved: number; rejected: number }>();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            trendMap.set(d, { approved: 0, rejected: 0 });
        }
        matches
            .filter(m => new Date(m.created_at) >= sevenDaysAgo)
            .forEach(m => {
                const day = m.created_at.slice(0, 10);
                if (!trendMap.has(day)) return;
                const entry = trendMap.get(day)!;
                if (m.status === "SENT" || m.status === "PENDING") entry.approved++;
                else if (m.status === "REJECTED") entry.rejected++;
            });

        const trend = Array.from(trendMap.entries()).map(([date, counts]) => ({ date, ...counts }));

        return NextResponse.json({
            stats: {
                total: matches.length,
                approved: approved.length,
                rejected: rejected.length,
                pending: pending.length,
                approvalRate,
                avgScore,
                suggestAutoAt75
            },
            scoreBuckets: buckets,
            trend
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
