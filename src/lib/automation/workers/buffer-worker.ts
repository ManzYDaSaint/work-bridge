/**
 * Automation worker: buffer-social-poster
 *
 * Triggered by JOB_POSTED or OPPORTUNITY_PUBLISHED events via the automation engine.
 * Fetches the job or opportunity record from Supabase, then calls postJobToBuffer()
 * or postOpportunityToBuffer() to publish to LinkedIn and Facebook Pages via Buffer GraphQL API.
 *
 * Expected payload: { jobId?: string; opportunityId?: string; employerId?: string; eventType?: string }
 */

import { registerPlugin } from "../registry";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { postJobToBuffer, postOpportunityToBuffer } from "@/lib/buffer";
import { emitSystemEvent } from "@/lib/mission-control";

const BufferSocialPoster = {
    id: "buffer-social-poster",
    run: async (payload: {
        jobId?: string;
        opportunityId?: string;
        employerId?: string;
        eventType?: string;
        taskId?: string;
    }): Promise<void> => {
        const { jobId, opportunityId } = payload;

        if (!jobId && !opportunityId) {
            console.warn("[BufferWorker] Neither jobId nor opportunityId in payload, skipping.");
            await emitSystemEvent({
                category: "AUTOMATION",
                severity: "INFO",
                event: "BUFFER_POST_SKIPPED",
                message: `BufferWorker skipped due to missing jobId and opportunityId`,
                metadata: { payload }
            });
            return;
        }

        // Bail silently if env vars are not yet configured.
        if (
            !process.env.BUFFER_API_KEY ||
            (!process.env.BUFFER_LINKEDIN_CHANNEL_ID && !process.env.BUFFER_FACEBOOK_CHANNEL_ID)
        ) {
            console.warn(
                "[BufferWorker] BUFFER_API_KEY or at least one channel ID not set — skipping."
            );
            await emitSystemEvent({
                category: "AUTOMATION",
                severity: "INFO",
                event: "BUFFER_NOT_CONFIGURED",
                message: `BufferWorker skipped due to missing configuration`,
                metadata: {}
            });
            return;
        }

        const supabase = getSupabaseAdminClient();
        if (!supabase) {
            throw new Error("[BufferWorker] Supabase admin client unavailable.");
        }

        if (opportunityId) {
            // Handle Opportunity Post
            const { data: opp, error: oppError } = await supabase
                .from("opportunities")
                .select("id, title, organization_name, category, slug, deadline, funding_amount, country")
                .eq("id", opportunityId)
                .single();

            if (oppError || !opp) {
                throw new Error(`[BufferWorker] Failed to fetch opportunity ${opportunityId}: ${oppError?.message}`);
            }

            const results = await postOpportunityToBuffer({
                id: opp.id,
                title: opp.title,
                organization_name: opp.organization_name,
                category: opp.category,
                slug: opp.slug,
                deadline: opp.deadline,
                funding_amount: opp.funding_amount,
                country: opp.country,
            });

            const linkedInStatus = results.linkedin
                ? results.linkedin.success
                    ? `✅ LinkedIn queued (postId=${results.linkedin.postId})`
                    : `❌ LinkedIn failed: ${results.linkedin.errorMessage}`
                : "⏭ LinkedIn not configured";

            const facebookStatus = results.facebook
                ? results.facebook.success
                    ? `✅ Facebook queued (postId=${results.facebook.postId})`
                    : `❌ Facebook failed: ${results.facebook.errorMessage}`
                : "⏭ Facebook not configured";

            console.log(
                `[BufferWorker] Opportunity "${opp.title}" (${opportunityId})\n  ${linkedInStatus}\n  ${facebookStatus}`
            );

            await emitSystemEvent({
                category: "AUTOMATION",
                severity: results.linkedin?.success || results.facebook?.success ? "SUCCESS" : "WARNING",
                event: "BUFFER_OPPORTUNITY_POST_RESULT",
                message: `Buffer worker processed opportunity ${opportunityId}`,
                metadata: { opportunityId, linkedin: results.linkedin, facebook: results.facebook }
            });
            return;
        }

        if (jobId) {
            // Handle Job Post
            const { data: job, error: jobError } = await supabase
                .from("jobs")
                .select("id, title, location, work_mode, type, salary_range, public_slug, employer_id")
                .eq("id", jobId)
                .single();

            if (jobError || !job) {
                throw new Error(`[BufferWorker] Failed to fetch job ${jobId}: ${jobError?.message}`);
            }

            let companyName: string | null = null;
            if (job.employer_id) {
                const { data: employer } = await supabase
                    .from("employers")
                    .select("company_name")
                    .eq("id", job.employer_id)
                    .single();
                companyName = employer?.company_name ?? null;
            }

            const results = await postJobToBuffer({
                id: job.id,
                title: job.title,
                companyName,
                location: job.location,
                workMode: job.work_mode,
                jobType: job.type,
                salaryRange: job.salary_range,
                publicSlug: job.public_slug,
            });

            const linkedInStatus = results.linkedin
                ? results.linkedin.success
                    ? `✅ LinkedIn queued (postId=${results.linkedin.postId}, dueAt=${results.linkedin.dueAt})`
                    : `❌ LinkedIn failed: ${results.linkedin.errorMessage}`
                : "⏭ LinkedIn not configured";

            const facebookStatus = results.facebook
                ? results.facebook.success
                    ? `✅ Facebook queued (postId=${results.facebook.postId}, dueAt=${results.facebook.dueAt})`
                    : `❌ Facebook failed: ${results.facebook.errorMessage}`
                : "⏭ Facebook not configured";

            console.log(
                `[BufferWorker] Job "${job.title}" (${jobId})\n  ${linkedInStatus}\n  ${facebookStatus}`
            );

            await emitSystemEvent({
                category: "AUTOMATION",
                severity: results.linkedin?.success || results.facebook?.success ? "SUCCESS" : "WARNING",
                event: "BUFFER_JOB_POST_RESULT",
                message: `Buffer worker processed job ${jobId}`,
                metadata: { jobId, linkedIn: results.linkedin, facebook: results.facebook }
            });
        }
    },
};

registerPlugin(BufferSocialPoster);
