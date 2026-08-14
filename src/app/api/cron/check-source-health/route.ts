import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { emitSystemEvent } from "@/lib/mission-control";

export const dynamic = "force-dynamic";

export async function GET() {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 1. Get all enabled sources
    const { data: sources, error: sourcesError } = await supabase
        .from("job_ingestion_sources")
        .select("id, name")
        .eq("is_enabled", true);

    if (sourcesError) return NextResponse.json({ error: sourcesError.message }, { status: 500 });

    for (const source of sources || []) {
        // 2. Check for jobs produced in last 24h
        const { count, error: jobsError } = await supabase
            .from("ingested_jobs_queue")
            .select("id", { count: "exact", head: true })
            .eq("source_id", source.id)
            .gte("created_at", twentyFourHoursAgo);

        if (jobsError) continue;

        // 3. If zero, mark as DEGRADED
        if (count === 0) {
            await supabase
                .from("job_ingestion_sources")
                .update({ health_status: "DEGRADED" })
                .eq("id", source.id);

            await emitSystemEvent({
                category: "INGESTION",
                severity: "CRITICAL",
                event: "INGESTION_SOURCE_DEGRADED",
                message: `Source ${source.name} is degraded - no jobs ingested in 24h`,
                metadata: { sourceId: source.id }
            });
        } else {
            // Otherwise, mark as HEALTHY
            await supabase
                .from("job_ingestion_sources")
                .update({ health_status: "HEALTHY" })
                .eq("id", source.id);
        }
    }

    return NextResponse.json({ success: true, message: "Source health check completed." });
}
