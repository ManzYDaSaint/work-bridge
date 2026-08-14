import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { emitSystemEvent } from "@/lib/mission-control";
import { processQueue } from "@/lib/automation/engine";
import { logApiError } from "@/lib/api-error-handler";
import { z } from "zod";

export const dynamic = "force-dynamic";

const RequestSchema = z.object({
    action: z.literal("FORCE_CRAWL"),
    sourceId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const validation = RequestSchema.safeParse(body);

    if (!validation.success) {
        return NextResponse.json({ error: "Invalid request data", details: validation.error.format() }, { status: 400 });
    }

    const { action, sourceId } = validation.data;

    try {
        if (action === "FORCE_CRAWL") {
            let sourcesToCrawl = [];
            if (sourceId) {
                sourcesToCrawl = [sourceId];
            } else {
                const { data: sources, error: sourcesError } = await supabase
                    .from("job_ingestion_sources")
                    .select("id")
                    .eq("is_enabled", true);
                if (sourcesError) throw sourcesError;
                sourcesToCrawl = sources?.map(s => s.id) || [];
            }

            if (sourcesToCrawl.length === 0) {
                return NextResponse.json({ error: "No enabled sources found to crawl" }, { status: 400 });
            }

            const tasks = sourcesToCrawl.map(sid => ({
                plugin_id: "job-ingestion-crawler",
                payload: { sourceId: sid },
                priority: "HIGH"
            }));

            const { error: taskError } = await supabase.from("automation_tasks").insert(tasks);

            if (taskError) {
                throw taskError;
            }

            await emitSystemEvent({
                category: "INGESTION",
                severity: "INFO",
                event: "INGESTION_FORCE_CRAWL_QUEUED",
                message: `Admin requested force crawl for ${sourcesToCrawl.length} source(s)`,
                actorId: undefined,
                metadata: { sourceIds: sourcesToCrawl }
            });

            try {
                await processQueue();
            } catch (processError: any) {
                console.error("[FORCE_CRAWL] Automation processing failed:", processError.message);
            }

            return NextResponse.json({ success: true, message: `${sourcesToCrawl.length} crawl tasks queued and processing attempted.` });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (err: any) {
        return logApiError(err, { action, metadata: { sourceId } });
    }
}
