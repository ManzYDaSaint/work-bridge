/**
 * Automation worker: job-ingestion-crawler
 *
 * Scans active job_ingestion_sources due for crawl, invokes connector to discover/fetch jobs,
 * stores raw payloads, and enqueues job-ingestion-parser tasks.
 */

import { registerPlugin } from "../registry";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getConnector } from "@/lib/ingestion/connectors";
import { emitSystemEvent } from "@/lib/mission-control";
import type { IngestionSource } from "@/lib/ingestion/types";

export const JobIngestionCrawlerWorker = {
    id: "job-ingestion-crawler",
    run: async (payload: { sourceId?: string; taskId?: string }): Promise<void> => {
        const supabase = getSupabaseAdminClient();
        if (!supabase) throw new Error("[CrawlerWorker] Supabase admin client unavailable.");

        // 1. Check Global System Kill Switch
        const { data: settingData } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'ingestion_service_enabled')
            .maybeSingle();

        const serviceEnabled = settingData ? (settingData.value as boolean) : true;
        if (!serviceEnabled) {
            console.log("[CrawlerWorker] Ingestion service is globally DISABLED via system_settings. Skipping crawl.");
            return;
        }

        // Fetch source(s) to process
        let query = supabase.from('job_ingestion_sources').select('*').eq('is_enabled', true);
        if (payload.sourceId) {
            query = query.eq('id', payload.sourceId);
        }

        const { data: sources, error } = await query;
        if (error || !sources || sources.length === 0) {
            console.log("[CrawlerWorker] No active ingestion sources due for crawl.");
            return;
        }

        for (const source of sources as IngestionSource[]) {
            try {
                const connector = getConnector(source.connector_type);
                const discovered = await connector.discoverJobs(source);

                let newPayloadsCount = 0;

                for (const ref of discovered) {
                    const fetched = await connector.fetchJob(ref, source);

                    // Insert raw payload (skip if checksum duplicate)
                    const { data: rawPayload, error: insertError } = await supabase
                        .from('ingested_raw_payloads')
                        .insert({
                            source_id: source.id,
                            external_id: ref.externalId,
                            url: fetched.url,
                            payload: fetched.rawContent,
                            content_type: fetched.contentType,
                            checksum: fetched.checksum,
                            processing_status: 'PENDING'
                        })
                        .select('id')
                        .maybeSingle();

                    if (!insertError && rawPayload) {
                        newPayloadsCount++;
                        // Run parser synchronously for instant results
                        try {
                            const { JobIngestionParserWorker } = await import("./ingestion-parser-worker");
                            await JobIngestionParserWorker.run({ rawPayloadId: rawPayload.id, sourceId: source.id });
                        } catch (parseErr: any) {
                            console.error(`[CrawlerWorker] Failed to parse payload ${rawPayload.id}:`, parseErr);
                        }
                    }
                }

                // Update source crawl metrics
                await supabase.from('job_ingestion_sources').update({
                    last_crawl_at: new Date().toISOString(),
                    last_success_at: new Date().toISOString(),
                    consecutive_errors: 0,
                    health_status: 'HEALTHY'
                }).eq('id', source.id);

                await emitSystemEvent({
                    category: 'AUTOMATION',
                    severity: 'SUCCESS',
                    event: 'INGESTION_CRAWL_COMPLETED',
                    message: `Crawl completed for ${source.name}: ${discovered.length} discovered, ${newPayloadsCount} new payloads queued.`,
                    metadata: { sourceId: source.id, discoveredCount: discovered.length, newPayloadsCount }
                });

            } catch (err: any) {
                console.error(`[CrawlerWorker] Source ${source.name} crawl failed:`, err.message);
                await supabase.from('job_ingestion_sources').update({
                    last_crawl_at: new Date().toISOString(),
                    consecutive_errors: source.consecutive_errors + 1,
                    last_error_message: err.message,
                    health_status: source.consecutive_errors >= 3 ? 'DEGRADED' : 'HEALTHY'
                }).eq('id', source.id);

                await emitSystemEvent({
                    category: 'AUTOMATION',
                    severity: 'WARNING',
                    event: 'INGESTION_CRAWL_FAILED',
                    message: `Crawl failed for source ${source.name}: ${err.message}`,
                    metadata: { sourceId: source.id, error: err.message }
                });
            }
        }
    }
};

registerPlugin(JobIngestionCrawlerWorker);
