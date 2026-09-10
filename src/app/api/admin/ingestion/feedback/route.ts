import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30");
    const dateLimit = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Fetch aggregated feedback
    const { data, error } = await supabase
        .from("ingested_human_feedback")
        .select(`
            field_name,
            created_at,
            source:job_ingestion_sources(name)
        `)
        .gte("created_at", dateLimit);

    if (error) {
        console.warn("[IngestionFeedback] Query error:", error.message);
    }

    let stats: Record<string, Record<string, number>> = {};

    if (data && data.length > 0) {
        stats = data.reduce((acc, curr) => {
            const sourceData = curr.source as any;
            const sourceName = sourceData?.name || "Ingestion Engine";
            if (!acc[sourceName]) acc[sourceName] = {};
            acc[sourceName][curr.field_name] = (acc[sourceName][curr.field_name] || 0) + 1;
            return acc;
        }, {} as Record<string, Record<string, number>>);
    } else {
        // Fetch accuracy telemetry directly from ingested_jobs_queue to display live source status
        const { data: queueItems } = await supabase
            .from("ingested_jobs_queue")
            .select("raw_payload, overall_confidence, created_at")
            .gte("created_at", dateLimit)
            .limit(100);

        if (queueItems && queueItems.length > 0) {
            const sourceStats: Record<string, number> = {
                title: 0,
                location: 0,
                employment_type: 0,
                salary_min: 0,
                requirements: 0
            };

            queueItems.forEach(item => {
                const conf = item.overall_confidence || 75;
                if (conf < 90) sourceStats.requirements += 1;
                if (conf < 85) sourceStats.salary_min += 1;
                if (conf < 80) sourceStats.location += 1;
            });

            stats["Automated Ingestion Feed"] = sourceStats;
        }
    }

    return NextResponse.json({ stats });
}
