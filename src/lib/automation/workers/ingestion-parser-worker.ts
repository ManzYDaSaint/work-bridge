/**
 * Automation worker: job-ingestion-parser
 *
 * Takes raw payload -> rule extraction -> optional Gemini enrichment -> job intelligence
 * -> duplicate detection -> inserts into ingested_jobs_queue -> triggers publisher if auto_publish.
 */

import { formatDescription } from "@/lib/ingestion/utils/formatDescription";
import { registerPlugin } from "../registry";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { extractJobFields } from "@/lib/ingestion/rule-extraction";
import { shouldCallGemini, getFieldsForGemini } from "@/lib/ingestion/confidence-engine";
import { enrichWithGemini } from "@/lib/ingestion/gemini-service";
import { analyzeJobIntelligence } from "@/lib/ingestion/job-intelligence";
import { checkForDuplicates } from "@/lib/ingestion/duplicate-detector";
import { deriveApplicationMethod } from "@/lib/ingestion/types";
import { emitSystemEvent } from "@/lib/mission-control";

export const JobIngestionParserWorker = {
    id: "job-ingestion-parser",
    run: async (payload: { rawPayloadId: string; sourceId: string; taskId?: string }): Promise<void> => {
        const supabase = getSupabaseAdminClient();
        if (!supabase) throw new Error("[ParserWorker] Supabase admin client unavailable.");
        let ruleResult;

        try {
            // 1. Fetch raw payload and source
            const { data: rawPayload, error: payloadErr } = await supabase
                .from('ingested_raw_payloads')
                .select('*')
                .eq('id', payload.rawPayloadId)
                .single();

            if (payloadErr || !rawPayload) {
                throw new Error(`[ParserWorker] Raw payload not found: ${payload.rawPayloadId}`);
            }

            const { data: source } = await supabase
                .from('job_ingestion_sources')
                .select('*')
                .eq('id', payload.sourceId)
                .single();

            ruleResult = await extractJobFields(
                rawPayload.payload,
                rawPayload.content_type,
                { defaultLocation: source?.default_location }
            );
        } catch (err: any) {
            console.error(`[ParserWorker] Failed parsing payload ${payload.rawPayloadId}:`, err.message);
            // Log to DLQ
            await supabase.from('ingested_dead_letter_queue').insert({
                source_id: payload.sourceId,
                payload: { rawPayloadId: payload.rawPayloadId },
                error_message: err.message,
                type: 'PARSER_ERROR'
            });
            throw err;
        }

        let finalJobFields = { ...ruleResult.data };
        let finalConfidence = { ...ruleResult.confidence };
        let overallConfidence = ruleResult.overallConfidence;
        let extractionMethod = ruleResult.extractionMethod;
        let aiModelUsed: string | null = null;
        let aiTokensUsed = 0;

        // 3. Non-Job Website Info Filter — skip promotional/info/blog pages BEFORE calling Gemini
        if (overallConfidence < 25) {
            await supabase
                .from('ingested_raw_payloads')
                .update({ processing_status: 'SKIPPED_UNCHANGED', error_message: 'Payload identified as non-vacancy website content' })
                .eq('id', rawPayload.id);

            await emitSystemEvent({
                category: 'AUTOMATION',
                severity: 'INFO',
                event: 'INGESTION_NON_JOB_SKIPPED',
                message: `Skipped non-job article/info page "${finalJobFields.title || rawPayload.url}"`,
                metadata: { rawPayloadId: rawPayload.id, overallConfidence }
            });
            return;
        }

        // 4. Gemini Enrichment (if needed and enabled)
        // 5. Job Intelligence (Analyze early to use for prioritization)
        const intel = analyzeJobIntelligence(finalJobFields);

        if (shouldCallGemini(ruleResult)) {
            const missingFields = getFieldsForGemini(ruleResult);
            if (missingFields.length > 0) {
                // Priority Check: Only enrich high-quality jobs, or sample low-quality ones
                const isHighQuality = intel.quality_score >= 60;
                const isSampled = Math.random() < 0.2; // Sample 20% of low-quality jobs

                if (isHighQuality || isSampled) {
                    // Normalize content for better cache hits
                    const normalizedContent = rawPayload.payload
                        .replace(/\s+/g, ' ')
                        .replace(/<[^>]+>/g, '')
                        .trim();
                    
                    const crypto = await import('crypto');
                    const normalizedHash = crypto.createHash('sha256').update(normalizedContent).digest('hex');

                    const aiResult = await enrichWithGemini(
                        rawPayload.payload,
                        finalJobFields,
                        missingFields,
                        normalizedHash
                    );

                    if (aiResult.result) {
                        extractionMethod = 'RULE_PLUS_AI';
                        aiModelUsed = 'gemini-2.0-flash';
                        aiTokensUsed = aiResult.tokensUsed;

                        // Merge Gemini fields (prefer existing rule fields if set)
                        const enriched = aiResult.result;
                        for (const key of missingFields) {
                            const val = (enriched as any)[key];
                            if (val !== undefined && val !== null) {
                                (finalJobFields as any)[key] = val;
                                (finalConfidence as any)[key] = Math.max(
                                    (finalConfidence as any)[key] || 0,
                                    enriched.confidence_score || 80
                                );
                            }
                        }
                        overallConfidence = Math.max(overallConfidence, enriched.confidence_score || overallConfidence);
                    }
                }
            }
        }

        // 5. Deadline check — skip expired jobs
        if (finalJobFields.deadline) {
            const deadlineDate = new Date(finalJobFields.deadline);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (deadlineDate < today) {
                await supabase
                    .from('ingested_raw_payloads')
                    .update({ processing_status: 'SKIPPED_UNCHANGED', error_message: 'Job deadline has already passed' })
                    .eq('id', rawPayload.id);

                await emitSystemEvent({
                    category: 'AUTOMATION',
                    severity: 'INFO',
                    event: 'INGESTION_JOB_EXPIRED_SKIPPED',
                    message: `Skipped expired job "${finalJobFields.title}" (Deadline: ${finalJobFields.deadline})`,
                    metadata: { rawPayloadId: rawPayload.id, deadline: finalJobFields.deadline }
                });
                return;
            }
        }

        // 6. Duplicate Detection
        const dupCheck = await checkForDuplicates(finalJobFields, rawPayload.url);

        // 7. Application Method Derivation
        const application_method = deriveApplicationMethod(finalJobFields);

        // Check Global Admin Approval Requirement Setting
        const { data: settingApproval } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'ingestion_require_admin_approval')
            .maybeSingle();

        const requireAdminApproval = settingApproval ? (settingApproval.value as boolean) : true;

        // Determine queue status
        let queueStatus: 'PENDING_REVIEW' | 'APPROVED' | 'DUPLICATE' = 'PENDING_REVIEW';
        if (dupCheck.isDuplicate) {
            queueStatus = 'DUPLICATE';
        } else if (!requireAdminApproval && source?.auto_publish && overallConfidence >= 85 && intel.scam_risk_score < 30) {
            queueStatus = 'APPROVED';
        }

        // 7. Insert into ingested_jobs_queue
        const { data: queueItem, error: queueErr } = await supabase
            .from('ingested_jobs_queue')
            .insert({
                raw_payload_id: rawPayload.id,
                source_id: payload.sourceId,
                title: finalJobFields.title || 'Untitled Vacancy',
                display_company_name: finalJobFields.display_company_name || source?.name || 'Unknown Company',
                description: formatDescription(finalJobFields.description || ''),
                location: finalJobFields.location || source?.default_location || 'Malawi',
                type: finalJobFields.type || 'Full-time',
                work_mode: finalJobFields.work_mode || 'ON_SITE',
                skills: finalJobFields.skills || [],
                must_have_skills: finalJobFields.must_have_skills || [],
                nice_to_have_skills: finalJobFields.nice_to_have_skills || [],
                minimum_years_experience: finalJobFields.minimum_years_experience || 0,
                qualification: finalJobFields.qualification || null,
                salary_range: finalJobFields.salary_range || null,
                deadline: finalJobFields.deadline || null,
                external_apply_url: finalJobFields.external_apply_url || null,
                apply_email: finalJobFields.apply_email || null,
                apply_whatsapp: finalJobFields.apply_whatsapp || null,
                apply_phone: finalJobFields.apply_phone || null,
                application_instructions: finalJobFields.application_instructions || null,
                application_method,
                extraction_method: extractionMethod,
                overall_confidence: overallConfidence,
                field_confidence: finalConfidence,
                ai_model_used: aiModelUsed,
                ai_tokens_used: aiTokensUsed,
                quality_score: intel.quality_score,
                scam_risk_score: intel.scam_risk_score,
                seniority_level: intel.seniority_level,
                industry_category: intel.industry_category,
                dna_hash: dupCheck.dnaHash,
                source_url_hash: dupCheck.sourceUrlHash,
                embedding: dupCheck.embedding,
                duplicate_of_job_id: dupCheck.duplicateOfJobId,
                duplicate_similarity: dupCheck.similarityScore,
                status: queueStatus,
            })
            .select('id')
            .single();

        if (queueErr) throw queueErr;

        // Update raw payload status
        await supabase
            .from('ingested_raw_payloads')
            .update({ processing_status: 'PARSED', parsed_at: new Date().toISOString() })
            .eq('id', rawPayload.id);

        // Auto-publish if approved
        if (queueStatus === 'APPROVED' && queueItem) {
            await supabase.from('automation_tasks').insert({
                plugin_id: 'job-ingestion-publisher',
                payload: { queueItemId: queueItem.id },
                priority: 'HIGH',
            });
        }

        await emitSystemEvent({
            category: 'AUTOMATION',
            severity: 'SUCCESS',
            event: 'INGESTION_JOB_PARSED',
            message: `Parsed job "${finalJobFields.title}" (${overallConfidence}% conf, method=${extractionMethod}, status=${queueStatus})`,
            metadata: { queueItemId: queueItem?.id, status: queueStatus, overallConfidence }
        });
    }
};

registerPlugin(JobIngestionParserWorker);
