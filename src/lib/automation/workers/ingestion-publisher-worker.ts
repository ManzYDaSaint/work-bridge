/**
 * Automation worker: job-ingestion-publisher
 *
 * Takes an approved job from ingested_jobs_queue, inserts it into public.jobs under system employer,
 * marks status = PUBLISHED, updates source metrics, and triggers downstream events (Buffer social post).
 */

import { registerPlugin } from "../registry";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { emitSystemEvent } from "@/lib/mission-control";
import { emitEvent } from "@/lib/automation/event-bus";

export const JobIngestionPublisherWorker = {
    id: "job-ingestion-publisher",
    run: async (payload: { queueItemId: string; reviewedBy?: string; taskId?: string }): Promise<void> => {
        const supabase = getSupabaseAdminClient();
        if (!supabase) throw new Error("[PublisherWorker] Supabase admin client unavailable.");

        // 1. Fetch queued job item
        const { data: item, error: itemErr } = await supabase
            .from('ingested_jobs_queue')
            .select('*')
            .eq('id', payload.queueItemId)
            .single();

        if (itemErr || !item) {
            throw new Error(`[PublisherWorker] Queue item not found: ${payload.queueItemId}`);
        }

        // 2. Locate actual employer profile by display_company_name or create LEAD employer
        let employerProfile: { id: string } | null = null;
        const targetCompanyName = item.display_company_name?.trim();

        if (targetCompanyName) {
            // First check if an employer with this company name already exists
            const { data: matchedEmployer } = await supabase
                .from('employers')
                .select('id, company_name')
                .ilike('company_name', targetCompanyName)
                .limit(1)
                .maybeSingle();

            if (matchedEmployer) {
                employerProfile = matchedEmployer;
            } else {
                // Auto-create a LEAD employer for this company
                const newLeadId = crypto.randomUUID();
                const now = new Date().toISOString();
                const { data: newLead } = await supabase
                    .from('employers')
                    .insert({
                        id: newLeadId,
                        company_name: targetCompanyName,
                        industry: item.industry_category || 'To be updated',
                        location: item.location || 'Malawi',
                        website: item.external_apply_url ? (() => {
                            try { return new URL(item.external_apply_url).origin; } catch { return null; }
                        })() : null,
                        recruitment_email: item.apply_email || null,
                        recruitment_url: item.external_apply_url || null,
                        account_type: 'LEAD',
                        status: 'PENDING',
                        recruiter_verified: false,
                        sourced_at: now,
                        created_at: now,
                    })
                    .select('id')
                    .maybeSingle();

                if (newLead) {
                    employerProfile = newLead;
                    const { CRMService } = await import("@/lib/crm/crm-service");
                    await CRMService.createLeadProfile(newLead.id, 10);
                }
            }
        }

        // Fallback: Locate Aganyu/System Recruiter entry if no employer was matched or created
        if (!employerProfile) {
            const { data: fallbackEmp } = await supabase
                .from('employers')
                .select('id')
                .or('company_name.ilike.%Aganyu%,company_name.ilike.%System Recruiter%')
                .limit(1)
                .maybeSingle();
            employerProfile = fallbackEmp;
        }

        if (!employerProfile) {
            const { data: systemUser } = await supabase
                .from('users')
                .select('id')
                .eq('email', 'jobs@aganyu.com')
                .maybeSingle();

            let targetUserId = systemUser?.id;
            if (!targetUserId) {
                const { data: adminUser } = await supabase
                    .from('users')
                    .select('id')
                    .eq('role', 'ADMIN')
                    .limit(1)
                    .maybeSingle();
                targetUserId = adminUser?.id;
            }

            if (!targetUserId) {
                throw new Error("[PublisherWorker] No system recruiter or admin user found to publish job under.");
            }

            // Auto-provision system employer profile if missing
            const { data: newProfile, error: profileErr } = await supabase
                .from('employers')
                .insert({
                    id: targetUserId,
                    company_name: 'Aganyu Recruiter',
                    status: 'APPROVED',
                    recruiter_verified: true,
                })
                .select('id')
                .single();

            if (profileErr) {
                console.error("[PublisherWorker] Employer auto-provision failed:", profileErr);
            } else if (newProfile) {
                employerProfile = newProfile;
            }
        }

        const employerId = employerProfile?.id;
        if (!employerId) {
            throw new Error("[PublisherWorker] Unable to assign employer ID for job publishing.");
        }

        // Generate public slug
        const baseSlug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const publicSlug = `${baseSlug}-${Date.now().toString(36)}`;

        // 3. Insert into public.jobs
        const { data: publishedJob, error: pubErr } = await supabase
            .from('jobs')
            .insert({
                employer_id: employerId,
                title: item.title,
                description: item.description,
                location: item.location,
                type: item.type,
                work_mode: item.work_mode,
                skills: item.skills,
                must_have_skills: item.must_have_skills,
                nice_to_have_skills: item.nice_to_have_skills,
                minimum_years_experience: item.minimum_years_experience,
                qualification: item.qualification,
                screening_questions: item.screening_questions || [],
                salary_range: item.salary_range,
                deadline: item.deadline,
                external_apply_url: item.external_apply_url,
                apply_email: item.apply_email,
                apply_whatsapp: item.apply_whatsapp,
                apply_phone: item.apply_phone,
                application_instructions: item.application_instructions,
                application_method: item.application_method,
                allow_one_tap_apply: item.allow_one_tap_apply ?? false,
                posting_type: item.posting_type || 'AGANYU',
                display_company_name: item.display_company_name,
                job_source: item.job_source || 'Ingestion Engine',
                status: 'ACTIVE',
                public_slug: publicSlug,
                dna_hash: item.dna_hash,
                embedding: item.embedding,
                ai_processed: item.extraction_method !== 'RULE_ONLY',
                ai_model_used: item.ai_model_used,
                ai_confidence: item.overall_confidence,
                source_content_hash: item.source_url_hash,
                raw_payload_id: item.raw_payload_id,
                ingestion_source_id: item.source_id,
                ingested_at: new Date().toISOString(),
            })
            .select('id')
            .single();

        if (pubErr) throw pubErr;

        // 4. Update queue item status
        await supabase
            .from('ingested_jobs_queue')
            .update({
                status: 'PUBLISHED',
                published_job_id: publishedJob.id,
                reviewed_by: payload.reviewedBy || null,
                reviewed_at: new Date().toISOString(),
            })
            .eq('id', item.id);

        // 5. Update source statistics
        const { error: rpcErr } = await supabase.rpc('increment_source_jobs_ingested', { source_id: item.source_id });
        if (rpcErr) {
            // Fallback direct update
            await supabase.from('job_ingestion_sources').update({
                last_job_found_at: new Date().toISOString()
            }).eq('id', item.source_id);
        }

        // 6. Run Domain Classifier Agent then trigger downstream events
        // Step 1: classify job domain (awaited — ensures domain_id is set on job row before matching)
        try {
            const { classifyDomainForRecord } = await import("@/lib/agents/domain-classifier-agent");
            await classifyDomainForRecord({
                target: "JOB",
                recordId: publishedJob.id,
                qualification: item.qualification,
                title: item.title,
                currentDomainId: null,
            });
        } catch (clsErr) {
            console.warn("[PublisherWorker] Domain classification failed (non-fatal):", clsErr);
        }

        // Step 2: run full match dispatch now that domain_id is ready (WhatsApp + Free Email)
        try {
            const { runMatchDispatchAgent } = await import("@/lib/agents/match-dispatch-agent");
            await runMatchDispatchAgent({ jobId: publishedJob.id, forceImmediateEmail: true });
        } catch (dispatchErr) {
            console.error("[PublisherWorker] Match dispatch agent error:", dispatchErr);
        }

        // Step 3: Trigger in-app/push match notifications
        try {
            const { triggerMatchNotifications } = await import("@/lib/match-notification-service");
            triggerMatchNotifications(publishedJob.id).catch((err) =>
                console.error("[PublisherWorker] Match notification error:", err)
            );
        } catch (notifErr) {
            console.error("[PublisherWorker] Match notification import failed:", notifErr);
        }

        await emitEvent({
            type: 'JOB_POSTED',
            payload: { jobId: publishedJob.id, employerId },
            priority: 'LOW',
        });

        await emitSystemEvent({
            category: 'AUTOMATION',
            severity: 'SUCCESS',
            event: 'INGESTION_JOB_PUBLISHED',
            message: `Published ingested job "${item.title}" (${publishedJob.id})`,
            metadata: { jobId: publishedJob.id, sourceId: item.source_id }
        });
    }
};

registerPlugin(JobIngestionPublisherWorker);
