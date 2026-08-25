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
import { validateExtractedJob } from "@/lib/ingestion/validation";
import { getSourceFeedbackContext } from "@/lib/ingestion/feedback-loop";
import { emitSystemEvent } from "@/lib/mission-control";
import { IngestionEvents } from "@/lib/ingestion/ingestion-events";

export const JobIngestionParserWorker = {
    id: "job-ingestion-parser",
    run: async (payload: { rawPayloadId: string; sourceId: string; taskId?: string }): Promise<void> => {
        const supabase = getSupabaseAdminClient();
        if (!supabase) throw new Error("[ParserWorker] Supabase admin client unavailable.");
        let ruleResult;
        let rawPayload;
        let source;

        try {
            // 1. Fetch raw payload and source
            const { data: rawPayloadData, error: payloadErr } = await supabase
                .from('ingested_raw_payloads')
                .select('*')
                .eq('id', payload.rawPayloadId)
                .single();
            rawPayload = rawPayloadData;

            if (payloadErr || !rawPayload) {
                throw new Error(`[ParserWorker] Raw payload not found: ${payload.rawPayloadId}`);
            }

            const { data: sourceData } = await supabase
                .from('job_ingestion_sources')
                .select('*')
                .eq('id', payload.sourceId)
                .single();
            source = sourceData;

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
        await emitSystemEvent({
            category: 'INGESTION',
            severity: 'INFO',
            event: IngestionEvents.EXTRACTION_STARTED,
            message: `Extraction started for raw payload ${rawPayload.id}`,
            metadata: { rawPayloadId: rawPayload.id, sourceId: payload.sourceId }
        });

        // 5. Early intelligence is used only to decide whether an AI repair is worth the cost.
        const preAiIntel = analyzeJobIntelligence(finalJobFields);

        if (shouldCallGemini(ruleResult)) {
            const missingFields = getFieldsForGemini(ruleResult);
            if (missingFields.length > 0) {
                // Priority Check: Only enrich high-quality jobs, or sample low-quality ones
                const isHighQuality = preAiIntel.quality_score >= 60;
                const isSampled = Math.random() < 0.2; // Sample 20% of low-quality jobs

                if (isHighQuality || isSampled) {
                    // Normalize content for better cache hits
                    const normalizedContent = rawPayload.payload
                        .replace(/\s+/g, ' ')
                        .replace(/<[^>]+>/g, '')
                        .trim();
                    
                    const crypto = await import('crypto');
                    const normalizedHash = crypto.createHash('sha256').update(normalizedContent).digest('hex');

                    const feedbackCtx = await getSourceFeedbackContext(payload.sourceId);

                    const aiResult = await enrichWithGemini(
                        rawPayload.payload,
                        finalJobFields,
                        missingFields,
                        normalizedHash,
                        feedbackCtx?.correctionExamples
                    );

                    if (aiResult.result) {
                        const enriched = aiResult.result;
                        const aiConfidence = enriched.confidence_score || 0;
                        const AI_MERGE_CONFIDENCE_THRESHOLD = 60;

                        if (aiConfidence >= AI_MERGE_CONFIDENCE_THRESHOLD) {
                            extractionMethod = 'RULE_PLUS_AI';
                            aiModelUsed = 'gemini-3.1-flash-lite';
                            aiTokensUsed = aiResult.tokensUsed;

                            const isValidFieldValue = (value: any) => {
                                if (value === undefined || value === null) return false;
                                if (typeof value === 'string' && value.trim() === '') return false;
                                if (Array.isArray(value) && value.length === 0) return false;
                                return true;
                            };

                            for (const key of missingFields) {
                                const val = (enriched as any)[key];
                                if (!isValidFieldValue(val)) {
                                    continue;
                                }

                                (finalJobFields as any)[key] = val;
                                (finalConfidence as any)[key] = Math.max(
                                    (finalConfidence as any)[key] || 0,
                                    aiConfidence
                                );
                            }

                            overallConfidence = Math.max(overallConfidence, aiConfidence);

                            await emitSystemEvent({
                                category: 'INGESTION',
                                severity: 'INFO',
                                event: IngestionEvents.AI_ENRICHMENT_COMPLETED,
                                message: `Gemini enrichment completed for raw payload ${rawPayload.id}`,
                                metadata: { rawPayloadId: rawPayload.id, aiConfidence, missingFields, fromCache: aiResult.fromCache },
                            });
                        } else {
                            await emitSystemEvent({
                                category: 'INGESTION',
                                severity: 'WARNING',
                                event: IngestionEvents.AI_ENRICHMENT_COMPLETED,
                                message: `Gemini returned low confidence (${aiConfidence}) for raw payload ${rawPayload.id}, skipping merge`,
                                metadata: { rawPayloadId: rawPayload.id, aiConfidence, missingFields, fromCache: aiResult.fromCache },
                            });
                        }
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

        // 6. Re-run intelligence after optional AI repair so quality/scam scores reflect final fields.
        const intel = analyzeJobIntelligence(finalJobFields);

        // 7. Application Method Derivation
        const application_method = deriveApplicationMethod(finalJobFields);

        // 8. Validation & Quality Gate
        const validation = validateExtractedJob({
            job: finalJobFields,
            applicationMethod: application_method,
            overallConfidence,
            intelligence: intel,
            sourceName: source?.name,
        });

        if (validation.decision === 'REJECTED') {
            await supabase
                .from('ingested_raw_payloads')
                .update({
                    processing_status: 'FAILED',
                    error_message: `Rejected by validation gate: ${validation.issues.join('; ')}`,
                    parsed_at: new Date().toISOString(),
                })
                .eq('id', rawPayload.id);

            await emitSystemEvent({
                category: 'INGESTION',
                severity: 'WARNING',
                event: IngestionEvents.VALIDATION_FAILED,
                message: `Rejected ingested payload "${finalJobFields.title || rawPayload.url}" before review`,
                metadata: {
                    rawPayloadId: rawPayload.id,
                    sourceId: payload.sourceId,
                    issues: validation.issues,
                    missingFields: validation.missingFields,
                    overallConfidence,
                    qualityScore: intel.quality_score,
                    scamRiskScore: intel.scam_risk_score,
                },
            });
            return;
        }

        // 9. Duplicate Detection
        const dupCheck = await checkForDuplicates(finalJobFields, rawPayload.url);

        // Check Global Admin Approval Requirement Setting
        const { data: settingApproval } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'ingestion_require_admin_approval')
            .maybeSingle();

        // Determine queue status — parsed jobs are placed directly into the Verification Queue (PENDING_REVIEW) for admin review
        let queueStatus: 'PENDING_REVIEW' | 'APPROVED' | 'DUPLICATE' | 'NEEDS_MORE_DATA' = 'PENDING_REVIEW';
        if (dupCheck.isDuplicate) {
            queueStatus = 'DUPLICATE';
        } else if (validation.decision === 'NEEDS_MORE_DATA') {
            queueStatus = 'NEEDS_MORE_DATA';
        }

        // 7. Insert into ingested_jobs_queue (Verification Queue)
        const { data: queueItem, error: queueErr } = await supabase
            .from('ingested_jobs_queue')
            .insert({
                raw_payload_id: rawPayload.id,
                source_id: payload.sourceId,
                title: finalJobFields.title || 'Needs Title',
                display_company_name: finalJobFields.display_company_name || source?.name || 'Needs Company',
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
                screening_questions: [],
                posting_type: 'AGANYU',
                allow_one_tap_apply: false,
                job_source: source?.name || 'Ingestion Engine',
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
                rejection_reason: validation.decision === 'NEEDS_MORE_DATA'
                    ? validation.issues.join('; ')
                    : null,
            })
            .select('id')
            .single();

        if (queueErr) throw queueErr;

        // Update raw payload status to PARSED immediately
        await supabase
            .from('ingested_raw_payloads')
            .update({ processing_status: 'PARSED', parsed_at: new Date().toISOString() })
            .eq('id', rawPayload.id);

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
