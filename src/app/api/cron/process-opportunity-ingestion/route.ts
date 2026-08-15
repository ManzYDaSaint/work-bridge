import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { crawlOpportunitySource } from "@/services/opportunityIngestionService";
import { emitSystemEvent } from "@/lib/mission-control";

export const maxDuration = 60;
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
    if (!supabase) {
        return NextResponse.json({ error: "Supabase client unavailable" }, { status: 500 });
    }

    try {
        // Fetch enabled opportunity sources (source_type = 'OPPORTUNITY')
        const { data: sources, error } = await supabase
            .from("job_ingestion_sources")
            .select("id, name, slug, last_crawl_at, crawl_frequency_minutes")
            .eq("is_enabled", true)
            .or("source_type.eq.OPPORTUNITY,slug.ilike.%scholarship%,slug.ilike.%opportunity%");

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const opportunitySources = sources || [];

        if (opportunitySources.length === 0) {
            return NextResponse.json({ success: true, message: "No opportunity ingestion sources found." });
        }

        let totalNew = 0;
        let totalDuplicates = 0;

        for (const source of opportunitySources) {
            try {
                const res = await crawlOpportunitySource(source.id);
                totalNew += res.newCount;
                totalDuplicates += res.duplicateCount;
            } catch (err: any) {
                console.error(`[OpportunityCron] Crawl failed for ${source.name}:`, err.message);
            }
        }

        await emitSystemEvent({
            category: "AUTOMATION",
            severity: "INFO",
            event: "OPPORTUNITY_CRON_COMPLETED",
            message: `Opportunity cron completed: ${totalNew} new opportunities staged, ${totalDuplicates} duplicates skipped.`,
            metadata: { totalNew, totalDuplicates, sourcesCount: opportunitySources.length }
        });

        return NextResponse.json({
            success: true,
            totalNew,
            totalDuplicates,
            processedSources: opportunitySources.length,
        });

    } catch (err: any) {
        console.error("[OpportunityCron] Failed:", err);
        return NextResponse.json({ error: err.message || "Cron failed" }, { status: 500 });
    }
}
