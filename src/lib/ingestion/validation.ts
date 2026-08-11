/**
 * Aganyu Job Ingestion Engine — Validation & Quality Gate
 *
 * Decides whether an extracted job is ready for review/publishing, needs
 * human repair, or should be rejected before it pollutes the review queue.
 */

import type { JobIntelligenceResult, StructuredJobFields } from "./types";

export type ValidationDecision = "READY" | "NEEDS_MORE_DATA" | "REJECTED";

export interface JobValidationResult {
    decision: ValidationDecision;
    issues: string[];
    missingFields: string[];
}

interface ValidationInput {
    job: Partial<StructuredJobFields>;
    applicationMethod: string;
    overallConfidence: number;
    intelligence: JobIntelligenceResult;
    sourceName?: string | null;
}

const MIN_REVIEW_CONFIDENCE = 50;
const MIN_REVIEW_QUALITY = 55;
const REJECT_QUALITY_BELOW = 35;
const REJECT_SCAM_RISK_AT = 70;

const GENERIC_TITLES = [
    "untitled vacancy",
    "job vacancy",
    "vacancy",
    "latest jobs",
    "jobs",
    "career opportunity",
    "employment opportunity",
];

export function validateExtractedJob(input: ValidationInput): JobValidationResult {
    const { job, applicationMethod, overallConfidence, intelligence, sourceName } = input;
    const issues: string[] = [];
    const missingFields: string[] = [];

    if (!isMeaningfulTitle(job.title)) {
        missingFields.push("title");
        issues.push("Missing or generic job title");
    }

    if (!isMeaningfulCompany(job.display_company_name, sourceName)) {
        missingFields.push("display_company_name");
        issues.push("Missing hiring company");
    }

    if (!isUsefulDescription(job.description)) {
        missingFields.push("description");
        issues.push("Description is missing or too thin");
    }

    if (!job.location || job.location.trim().length < 2) {
        missingFields.push("location");
        issues.push("Missing location");
    }

    if (!hasApplyPath(job, applicationMethod)) {
        missingFields.push("application_method");
        issues.push("Missing application URL, email, phone, WhatsApp, or clear application instructions");
    }

    if (overallConfidence < MIN_REVIEW_CONFIDENCE) {
        issues.push(`Extraction confidence below review threshold (${overallConfidence}%)`);
    }

    if (intelligence.quality_score < MIN_REVIEW_QUALITY) {
        issues.push(`Quality score below review threshold (${intelligence.quality_score})`);
    }

    if (intelligence.scam_risk_score >= REJECT_SCAM_RISK_AT) {
        issues.push(`Scam risk too high (${intelligence.scam_risk_score})`);
        return { decision: "REJECTED", issues, missingFields };
    }

    const criticalMissing = missingFields.some((field) =>
        ["title", "description", "application_method"].includes(field)
    );

    if (intelligence.quality_score < REJECT_QUALITY_BELOW && criticalMissing) {
        return { decision: "REJECTED", issues, missingFields };
    }

    if (issues.length > 0) {
        return { decision: "NEEDS_MORE_DATA", issues, missingFields };
    }

    return { decision: "READY", issues, missingFields };
}

function isMeaningfulTitle(title?: string | null): boolean {
    const cleaned = (title || "").trim().toLowerCase();
    if (cleaned.length < 4 || cleaned.length > 140) return false;
    if (GENERIC_TITLES.includes(cleaned)) return false;
    if (/^(home|about|contact|privacy policy|terms)$/i.test(cleaned)) return false;
    return true;
}

function isMeaningfulCompany(company?: string | null, sourceName?: string | null): boolean {
    const cleaned = (company || "").trim();
    if (cleaned.length >= 2 && !/^unknown company$/i.test(cleaned)) return true;
    return Boolean(sourceName && sourceName.trim().length >= 2);
}

function isUsefulDescription(description?: string | null): boolean {
    const cleaned = (description || "").replace(/\s+/g, " ").trim();
    if (cleaned.length < 80) return false;
    if (/^(home|about us|contact us|privacy policy|terms and conditions)$/i.test(cleaned)) return false;
    return true;
}

function hasApplyPath(job: Partial<StructuredJobFields>, applicationMethod: string): boolean {
    if (applicationMethod !== "manual") return true;
    return Boolean(job.application_instructions && job.application_instructions.trim().length >= 20);
}
