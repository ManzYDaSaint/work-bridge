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
        let sourceId = body.sourceId;

        // If no sourceId provided, find or auto-create default active scholarship sources
        if (!sourceId) {
            const { data: defaultSource } = await supabase
                .from("opportunity_ingestion_sources")
                .select("id")
                .or("slug.eq.opportunities-for-africans-rss,slug.eq.greatyop-rss,slug.eq.opportunity-desk-rss,name.ilike.%Opportunities For Africans%")
                .maybeSingle();

            if (defaultSource) {
                sourceId = defaultSource.id;
            } else {
                // Auto-create default Opportunities For Africans source on the fly
                const { data: newSource, error: seedErr } = await supabase
                    .from("opportunity_ingestion_sources")
                    .insert({
                        name: "Opportunities For Africans RSS",
                        slug: "opportunities-for-africans-rss",
                        connector_type: "RSS",
                        base_url: "https://www.opportunitiesforafricans.com",
                        feed_url: "https://www.opportunitiesforafricans.com/feed/",
                        default_location: "Africa",
                        is_enabled: true,
                        auto_publish: false,
                        crawl_frequency_minutes: 720,
                    })
                    .select("id")
                    .single();

                if (!seedErr && newSource) {
                    sourceId = newSource.id;
                }
            }
        }

        if (!sourceId) {
            return NextResponse.json({ error: "No opportunity ingestion source configured in database." }, { status: 404 });
        }

        const result = await crawlOpportunitySource(sourceId);
        return NextResponse.json({ success: true, ...result });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Crawl failed" }, { status: 500 });
    }
}
