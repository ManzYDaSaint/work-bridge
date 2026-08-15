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

        // If no sourceId provided, find default ScholarshipTab source
        if (!sourceId) {
            const { data: defaultSource } = await supabase
                .from("job_ingestion_sources")
                .select("id")
                .ilike("name", "%ScholarshipTab%")
                .maybeSingle();

            sourceId = defaultSource?.id;
        }

        if (!sourceId) {
            return NextResponse.json({ error: "No opportunity ingestion source found" }, { status: 404 });
        }

        const result = await crawlOpportunitySource(sourceId);
        return NextResponse.json({ success: true, ...result });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Crawl failed" }, { status: 500 });
    }
}
