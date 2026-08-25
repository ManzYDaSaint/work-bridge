/**
 * Aganyu Job Ingestion Engine — Feedback Loop Service
 *
 * Fetches recent human edit corrections for a given source ID to construct
 * few-shot prompt context for AI enrichment.
 */

import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export interface SourceFeedbackContext {
    sourceId: string;
    correctionExamples: {
        fieldName: string;
        originalValue: any;
        correctedValue: any;
    }[];
}

/**
 * Retrieves the recent field corrections made by human reviewers for a given ingestion source.
 * Limits to top 5 most recent distinct field edits to avoid prompt bloat.
 */
export async function getSourceFeedbackContext(sourceId: string, limit = 5): Promise<SourceFeedbackContext | null> {
    if (!sourceId) return null;
    try {
        const supabase = getSupabaseAdminClient();
        if (!supabase) return null;

        const { data, error } = await supabase
            .from("ingested_human_feedback")
            .select("field_name, original_value, corrected_value")
            .eq("source_id", sourceId)
            .order("created_at", { ascending: false })
            .limit(limit * 2);

        if (error || !data || data.length === 0) {
            return null;
        }

        // Deduplicate by field_name to present varied examples
        const seenFields = new Set<string>();
        const examples: SourceFeedbackContext["correctionExamples"] = [];

        for (const row of data) {
            if (!seenFields.has(row.field_name) && examples.length < limit) {
                seenFields.add(row.field_name);
                examples.push({
                    fieldName: row.field_name,
                    originalValue: row.original_value,
                    correctedValue: row.corrected_value,
                });
            }
        }

        return {
            sourceId,
            correctionExamples: examples,
        };
    } catch (err) {
        console.error("[FeedbackLoop] Failed to fetch source feedback context:", err);
        return null;
    }
}
