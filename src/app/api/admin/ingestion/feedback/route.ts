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

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Process/Aggregate data
    const stats = data.reduce((acc, curr) => {
        const sourceData = curr.source as any;
        const sourceName = sourceData?.name || "Unknown";
        if (!acc[sourceName]) acc[sourceName] = {};
        acc[sourceName][curr.field_name] = (acc[sourceName][curr.field_name] || 0) + 1;
        return acc;
    }, {} as Record<string, Record<string, number>>);

    return NextResponse.json({ stats });
}
