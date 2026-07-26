/**
 * Automation worker: opportunity-matcher
 *
 * Triggered by the OPPORTUNITY_PUBLISHED event via the automation engine.
 * Generates AI matches between a newly published opportunity and all job seekers.
 * Also triggers Buffer social sharing for FEATURED opportunities.
 *
 * Expected payload: { opportunityId: string; featured?: boolean; eventType: string }
 */

import { registerPlugin } from "../registry";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { triggerOpportunityMatchNotifications } from "@/lib/opportunity-match-service";
import { postOpportunityToBuffer } from "@/lib/buffer";
import { emitSystemEvent } from "@/lib/mission-control";

const OpportunityMatcher = {
    id: "opportunity-matcher",
    run: async (payload: {
        opportunityId: string;
        featured?: boolean;
        eventType?: string;
        taskId?: string;
    }): Promise<void> => {
        const { opportunityId, featured } = payload;

        if (!opportunityId) {
            console.warn("[OpportunityMatcher] No opportunityId in payload, skipping.");
            return;
        }

        const supabase = getSupabaseAdminClient();
        if (!supabase) {
            throw new Error("[OpportunityMatcher] Supabase admin client unavailable.");
        }

        // Fetch the opportunity record
        const { data: opp, error: oppError } = await supabase
            .from("opportunities")
            .select("id, title, slug, category, organization_name, deadline, funding_amount, country, featured, status")
            .eq("id", opportunityId)
            .single();

        if (oppError || !opp) {
            throw new Error(`[OpportunityMatcher] Failed to fetch opportunity ${opportunityId}: ${oppError?.message}`);
        }

        // 1. Run AI matching — creates match records + sends in-app notifications
        await triggerOpportunityMatchNotifications(opportunityId);

        // 2. If featured (or marked featured in DB), also queue a social post
        const isFeatured = featured ?? opp.featured ?? false;
        if (isFeatured) {
            if (
                !process.env.BUFFER_API_KEY ||
                (!process.env.BUFFER_LINKEDIN_CHANNEL_ID && !process.env.BUFFER_FACEBOOK_CHANNEL_ID)
            ) {
                console.warn("[OpportunityMatcher] Buffer not configured — skipping social post.");
            } else {
                try {
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
                        `[OpportunityMatcher] Social share for "${opp.title}"\n  ${linkedInStatus}\n  ${facebookStatus}`
                    );

                    await emitSystemEvent({
                        category: "OPPORTUNITY_MANAGEMENT",
                        severity: results.linkedin?.success || results.facebook?.success ? "SUCCESS" : "WARNING",
                        event: "OPPORTUNITY_SOCIAL_POST_QUEUED",
                        message: `Social post queued for featured opportunity: ${opp.title}`,
                        metadata: {
                            opportunityId,
                            title: opp.title,
                            linkedin: results.linkedin,
                            facebook: results.facebook,
                        },
                    });
                } catch (err: any) {
                    console.error("[OpportunityMatcher] Social post failed:", err.message);
                    await emitSystemEvent({
                        category: "OPPORTUNITY_MANAGEMENT",
                        severity: "WARNING",
                        event: "OPPORTUNITY_SOCIAL_POST_FAILED",
                        message: `Social post failed for opportunity: ${opp.title}`,
                        metadata: { opportunityId, error: err.message },
                    });
                }
            }
        }
    },
};

registerPlugin(OpportunityMatcher);
