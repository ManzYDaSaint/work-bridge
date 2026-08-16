import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getStagedOpportunitiesQueue, crawlOpportunitySource } from "@/services/opportunityIngestionService";

export async function GET(request: Request) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status") || "PENDING_REVIEW";

        const queue = await getStagedOpportunitiesQueue(status);
        return NextResponse.json({ queue });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to fetch queue" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const specificSourceId: string | null = body.sourceId || null;

        const { getSupabaseAdminClient } = await import("@/lib/supabase-admin");
        const adminClient = getSupabaseAdminClient() || supabase;

        let sourceIds: string[] = [];

        if (specificSourceId) {
            sourceIds = [specificSourceId];
        } else {
            // Crawl ALL enabled sources (not just the first one)
            const { data: allSources, error: queryErr } = await adminClient
                .from("opportunity_ingestion_sources")
                .select("id, name")
                .eq("is_enabled", true);

            if (queryErr || !allSources || allSources.length === 0) {
                console.error("[OpportunityIngestion] No enabled opportunity sources found.", queryErr?.message);
                return NextResponse.json(
                    { error: "No opportunity ingestion sources configured in database." },
                    { status: 404 }
                );
            }

            sourceIds = allSources.map((s: { id: string }) => s.id);
            console.log(`[OpportunityIngestion] Crawling ${sourceIds.length} sources:`, allSources.map((s: any) => s.name).join(", "));
        }

        // Crawl each source sequentially — one failure doesn't block the rest
        let totalNew = 0;
        let totalDuplicates = 0;
        let totalErrors = 0;
        const sourceResults: Record<string, any> = {};

        for (const sid of sourceIds) {
            try {
                const result = await crawlOpportunitySource(sid);
                totalNew += result.newCount;
                totalDuplicates += result.duplicateCount;
                totalErrors += (result as any).errorCount ?? 0;
                sourceResults[sid] = result;
            } catch (sourceErr: any) {
                console.error(`[OpportunityIngestion] Crawl failed for source ${sid}:`, sourceErr.message);
                sourceResults[sid] = { error: sourceErr.message };
                totalErrors++;
            }
        }

        return NextResponse.json({
            success: true,
            newCount: totalNew,
            duplicateCount: totalDuplicates,
            errorCount: totalErrors,
            sourcesProcessed: sourceIds.length,
            sourceResults,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Crawl failed" }, { status: 500 });
    }
}
