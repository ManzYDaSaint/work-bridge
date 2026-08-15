import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "ACTIONABLE";
    const sourceId = searchParams.get("sourceId");
    const minConfidence = searchParams.get("minConfidence");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 1. Fetch queued items
    let queueQuery = supabase
        .from("ingested_jobs_queue")
        .select(`
            *,
            source:job_ingestion_sources(id, name, connector_type, reputation_score)
        `, { count: "exact" });

    if (status === "ACTIONABLE") {
        queueQuery = queueQuery.in("status", ["PENDING_REVIEW", "NEEDS_MORE_DATA"]);
    } else {
        queueQuery = queueQuery.eq("status", status);
    }

    if (sourceId) {
        queueQuery = queueQuery.eq("source_id", sourceId);
    }
    if (minConfidence) {
        queueQuery = queueQuery.gte("overall_confidence", parseInt(minConfidence));
    }

    const { data: queueItems, error: queueErr, count: totalCount } = await queueQuery
        .order("created_at", { ascending: false })
        .range(from, to);

    if (queueErr) {
        return NextResponse.json({ error: queueErr.message }, { status: 500 });
    }

    // 2. Fetch metrics
    const { count: pendingCount, error: pendingCountErr } = await supabase
        .from("ingested_jobs_queue")
        .select("id", { count: "exact", head: true })
        .eq("status", "PENDING_REVIEW");
    if (pendingCountErr) {
        return NextResponse.json({ error: pendingCountErr.message }, { status: 500 });
    }

    const { count: publishedCount, error: publishedCountErr } = await supabase
        .from("ingested_jobs_queue")
        .select("id", { count: "exact", head: true })
        .eq("status", "PUBLISHED");
    if (publishedCountErr) {
        return NextResponse.json({ error: publishedCountErr.message }, { status: 500 });
    }

    const { count: needsMoreDataCount, error: needsMoreDataCountErr } = await supabase
        .from("ingested_jobs_queue")
        .select("id", { count: "exact", head: true })
        .eq("status", "NEEDS_MORE_DATA");
    if (needsMoreDataCountErr) {
        return NextResponse.json({ error: needsMoreDataCountErr.message }, { status: 500 });
    }

    const { count: sourcesCount, error: sourcesCountErr } = await supabase
        .from("job_ingestion_sources")
        .select("id", { count: "exact", head: true })
        .or("source_type.eq.JOB,source_type.is.null")
        .eq("is_enabled", true);
    if (sourcesCountErr) {
        return NextResponse.json({ error: sourcesCountErr.message }, { status: 500 });
    }

    const { data: sources, error: sourcesErr } = await supabase
        .from("job_ingestion_sources")
        .select("*")
        .or("source_type.eq.JOB,source_type.is.null")
        .order("reputation_score", { ascending: false });
    if (sourcesErr) {
        return NextResponse.json({ error: sourcesErr.message }, { status: 500 });
    }

    // 3. Fetch system settings
    const { data: settingsRows, error: settingsErr } = await supabase
        .from("system_settings")
        .select("*");
    if (settingsErr) {
        return NextResponse.json({ error: settingsErr.message }, { status: 500 });
    }

    const settings: Record<string, boolean> = {
        ingestion_service_enabled: true,
        ingestion_require_admin_approval: true,
    };

    if (settingsRows) {
        settingsRows.forEach((s) => {
            settings[s.key] = s.value === true || s.value === "true";
        });
    }

    return NextResponse.json({
        queueItems: queueItems || [],
        totalCount: totalCount || 0,
        sources: sources || [],
        settings,
        metrics: {
            pendingCount: pendingCount || 0,
            needsMoreDataCount: needsMoreDataCount || 0,
            publishedCount: publishedCount || 0,
            sourcesCount: sourcesCount || 0,
        }
    });
}
