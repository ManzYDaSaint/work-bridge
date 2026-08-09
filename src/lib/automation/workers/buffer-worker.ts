/**
 * Automation worker: buffer-social-poster
 *
 * Triggered by the JOB_POSTED event via the automation engine.
 * Fetches the full job record from Supabase, then calls postJobToBuffer()
 * to publish to LinkedIn and Facebook Pages via the Buffer GraphQL API.
 *
 * Expected payload: { jobId: string; employerId: string; eventType: string }
 */

import { registerPlugin } from "../registry";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { postJobToBuffer } from "@/lib/buffer";
import { emitSystemEvent } from "@/lib/mission-control";

const BufferSocialPoster = {
    id: "buffer-social-poster",
    run: async (payload: {
        jobId: string;
        employerId?: string;
        eventType?: string;
        taskId?: string;
    }): Promise<void> => {
        const { jobId } = payload;

        if (!jobId) {
            console.warn("[BufferWorker] No jobId in payload, skipping.");
            await emitSystemEvent({
                category: "AUTOMATION",
                severity: "INFO",
                event: "BUFFER_JOB_SKIPPED",
                message: `BufferWorker skipped due to missing jobId`,
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

        // Fetch the job record
        const { data: job, error: jobError } = await supabase
            .from("jobs")
            .select("id, title, location, work_mode, type, salary_range, public_slug, employer_id")
            .eq("id", jobId)
            .single();

        if (jobError || !job) {
            throw new Error(`[BufferWorker] Failed to fetch job ${jobId}: ${jobError?.message}`);
        }

        // Fetch employer name
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
            severity: "INFO",
            event: "BUFFER_JOB_POST_RESULT",
            message: `Buffer worker processed job ${jobId}`,
            metadata: { jobId, linkedIn: results.linkedin, facebook: results.facebook }
        });
    },
};

registerPlugin(BufferSocialPoster);
