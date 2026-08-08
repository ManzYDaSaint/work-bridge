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

                // CHUNKING (Parallel Processing) - Process 5 jobs at a time
                const chunkSize = 5;
                for (let i = 0; i < discovered.length; i += chunkSize) {
                    const chunk = discovered.slice(i, i + chunkSize);

                    await Promise.allSettled(chunk.map(async (ref) => {
                        // OPTIMIZATION: Check if we already have this URL in raw_payloads (avoid re-fetching)
                        const { data: existing } = await supabase
                            .from('ingested_raw_payloads')
                            .select('id')
                            .eq('external_id', ref.externalId)
                            .maybeSingle();

                        if (existing) return;

                        // Smart Retry / Rate Limit Avoidance
                        await new Promise(res => setTimeout(res, Math.random() * 500)); 

                        try {
                            const fetched = await connector.fetchJob(ref, source);

                            // OPTIMIZATION: Skip expired jobs — don't store them at all
                            if (fetched.checksum === 'EXPIRED_SKIP' || !fetched.rawContent) {
                                console.log(`[CrawlerWorker] Skipped expired job: ${ref.title}`);
                                return;
                            }

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
                                const { JobIngestionParserWorker } = await import("./ingestion-parser-worker");
                                await JobIngestionParserWorker.run({ rawPayloadId: rawPayload.id, sourceId: source.id });
                            }
                        } catch (err: any) {
                            console.error(`[CrawlerWorker] Failed processing ${ref.url}:`, err.message);
                        }
                    }));
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
                if (source.consecutive_errors >= 2) { // will become 3 after this update
                    try {
                        const { sendAdminSecurityAlert } = await import("@/lib/resend");
                        await sendAdminSecurityAlert({
                            event: `Job Ingestion Source Failing: ${source.name}`,
                            details: `The crawler has failed 3 consecutive times for ${source.name}.\n\nLast Error: ${err.message}\n\nPlease check the source website to see if their layout or RSS feed has changed.`
                        });
                    } catch (emailErr) {
                        console.error("[CrawlerWorker] Failed to send alert email:", emailErr);
                    }
                }

                await supabase.from('job_ingestion_sources').update({
                    last_crawl_at: new Date().toISOString(),
                    consecutive_errors: source.consecutive_errors + 1,
                    last_error_message: err.message,
                    health_status: source.consecutive_errors >= 2 ? 'DEGRADED' : 'HEALTHY'
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
