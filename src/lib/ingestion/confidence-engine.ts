/**
 * Aganyu Job Ingestion Engine — Confidence Decision Engine
 *
 * Determines whether a job needs Gemini Flash enrichment or if
 * rule-based extraction alone is sufficient. Keeps AI costs near zero
 * by only calling Gemini on the ~20-30% of jobs that truly need it.
 */

import type { RuleExtractionResult, FieldConfidenceMap } from "./types";

// ─────────────────────────────────────────────────────────────────
// Thresholds
// ─────────────────────────────────────────────────────────────────

/** Overall confidence above which Gemini is NOT called. */
export const AI_REQUIRED_THRESHOLD = 90;

/** Per-field minimum — critical fields below this trigger Gemini. */
export const CRITICAL_FIELD_THRESHOLD = 70;

/** Fields that MUST be high-confidence to skip Gemini. */
const CRITICAL_FIELDS: (keyof FieldConfidenceMap)[] = [
    'title',
    'display_company_name',
    'description',
];

// ─────────────────────────────────────────────────────────────────
// Decision Functions
// ─────────────────────────────────────────────────────────────────

/**
 * Returns true if this job needs Gemini enrichment.
 * Returns false if rule-based extraction is sufficient.
 */
export function shouldCallGemini(result: RuleExtractionResult): boolean {
    // If overall confidence is high enough...
    if (result.overallConfidence >= AI_REQUIRED_THRESHOLD) {
        // ...also verify all critical fields are above threshold
        const allCriticalHigh = CRITICAL_FIELDS.every(
            f => (result.confidence[f] ?? 0) >= CRITICAL_FIELD_THRESHOLD
        );
        if (allCriticalHigh) return false;
    }
    return true;
}

/**
 * Returns only the field names that need AI enrichment.
 * These are fields with confidence below the critical threshold.
 */
export function getFieldsForGemini(result: RuleExtractionResult): string[] {
    return Object.entries(result.confidence)
        .filter(([_, conf]) => (conf as number) < CRITICAL_FIELD_THRESHOLD)
        .map(([field]) => field);
}
