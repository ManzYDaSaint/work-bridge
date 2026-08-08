import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
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

    // 1. Defence-in-depth: Check global ingestion kill switch before doing anything
    const { data: settingData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'ingestion_service_enabled')
        .maybeSingle();

    const serviceEnabled = settingData ? (settingData.value === true || settingData.value === 'true') : true;
    if (!serviceEnabled) {
        await emitSystemEvent({
            category: 'AUTOMATION',
            severity: 'INFO',
            event: 'INGESTION_CRON_SKIPPED',
            message: 'Ingestion cron skipped — service is globally DISABLED via system_settings.',
            metadata: {}
        });
        return NextResponse.json({ success: true, skipped: true, reason: 'Ingestion service disabled', tasksQueued: 0 });
    }

    // 2. Fetch enabled sources where last_crawl_at + crawl_frequency_minutes < NOW()
    const { data: sources, error } = await supabase
        .from('job_ingestion_sources')
        .select('id, name, last_crawl_at, crawl_frequency_minutes')
        .eq('is_enabled', true);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const now = Date.now();
    let tasksQueued = 0;

    // 3. Queue crawl tasks for sources due for crawl
    for (const source of sources || []) {
        const lastCrawl = source.last_crawl_at ? new Date(source.last_crawl_at).getTime() : 0;
        const frequencyMs = (source.crawl_frequency_minutes || 360) * 60 * 1000;

        if (now - lastCrawl >= frequencyMs) {
            await supabase.from('automation_tasks').insert({
                plugin_id: 'job-ingestion-crawler',
                payload: { sourceId: source.id },
                priority: 'HIGH',
            });
            tasksQueued++;
        }
    }

    await emitSystemEvent({
        category: 'AUTOMATION',
        severity: 'INFO',
        event: 'INGESTION_CRON_TRIGGERED',
        message: `Ingestion cron evaluated ${sources?.length || 0} sources, queued ${tasksQueued} crawl tasks`,
        metadata: { tasksQueued }
    });

    return NextResponse.json({ success: true, tasksQueued, evaluatedSources: sources?.length || 0 });
}
