import { getSupabaseAdminClient } from "@/lib/supabase-admin";

/**
 * Service to manage Employer CRM logic, lifecycle, and scoring.
 */
export const CRMService = {
    /**
     * Updates an employer's CRM score based on activity.
     */
    async updateScore(employerId: string, scoreDelta: number) {
        const supabase = getSupabaseAdminClient();
        if (!supabase) return;

        const { data: existing, error: fetchError } = await supabase
            .from("employer_crm_profiles")
            .select("id, engagement_score")
            .eq("employer_id", employerId)
            .maybeSingle();

        if (fetchError) throw fetchError;

        const currentScore = existing?.engagement_score ?? 0;
        const engagementScore = Math.max(0, currentScore + scoreDelta);
        const priority = engagementScore >= 100 ? "HIGH" : engagementScore >= 40 ? "MEDIUM" : "LOW";
        const now = new Date().toISOString();

        if (!existing) {
            const { error } = await supabase
                .from("employer_crm_profiles")
                .insert({
                    employer_id: employerId,
                    status: "REGISTERED",
                    engagement_score: engagementScore,
                    priority,
                    last_activity_at: now,
                    updated_at: now,
                });
            if (error) throw error;
            return;
        }

        const { error } = await supabase
            .from("employer_crm_profiles")
            .update({
                engagement_score: engagementScore,
                priority,
                last_activity_at: now,
                updated_at: now,
            })
            .eq("id", existing.id);

        if (error) throw error;
    },

    /**
     * Transitions an employer status.
     */
    async updateStatus(employerId: string, status: string) {
        const supabase = getSupabaseAdminClient();
        if (!supabase) return;

        const { error } = await supabase
            .from('employer_crm_profiles')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('employer_id', employerId);

        if (error) throw error;
    }
};
