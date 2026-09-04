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

        // Run AI matching — creates match records + sends in-app notifications
        await triggerOpportunityMatchNotifications(opportunityId);
    },
};

registerPlugin(OpportunityMatcher);
