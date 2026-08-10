/**
 * Aganyu Job Ingestion Engine — Core Types
 *
 * Shared type definitions used across all ingestion modules:
 * connectors, rule engine, AI enrichment, intelligence, and publishing.
 */

import { ScreeningQuestion } from '@/types';

// ─────────────────────────────────────────────────────────────────
// Source Registry
// ─────────────────────────────────────────────────────────────────

export type ConnectorType = 'RSS' | 'REST_API' | 'CAREER_PAGE' | 'HTML_PARSER' | 'EMAIL_WEBHOOK';
export type SourceHealthStatus = 'HEALTHY' | 'DEGRADED' | 'FAILING' | 'DISABLED';

export interface IngestionSource {
    id: string;
    name: string;
    slug: string;
    connector_type: ConnectorType;
    base_url: string;
    feed_url: string | null;
    default_location: string;
    is_enabled: boolean;
    auto_publish: boolean;

    // Scheduling
    crawl_frequency_minutes: number;
    adaptive_scheduling: boolean;
    min_frequency_minutes: number;
    max_frequency_minutes: number;

    // Reputation
    reputation_score: number;
    health_status: SourceHealthStatus;
    total_jobs_ingested: number;
    total_duplicates: number;
    total_rejections: number;
    last_crawl_at: string | null;
    last_success_at: string | null;
    last_job_found_at: string | null;
    error_count: number;
    consecutive_errors: number;
    last_error_message: string | null;

    // Compliance
    robots_allowed: boolean;
    last_robots_check: string | null;
    terms_reviewed: boolean;
    attribution_required: boolean;
    compliance_notes: string | null;

    // Config
    auth_config: Record<string, any>;
    selector_config: Record<string, any>;
    custom_headers: Record<string, string>;

    created_at: string;
    updated_at: string;
}

// ─────────────────────────────────────────────────────────────────
// Connector Framework
// ─────────────────────────────────────────────────────────────────

/** Lightweight reference to a discovered job before fetching its full content. */
export interface DiscoveredJobRef {
    externalId: string;
    url: string;
    title?: string;
    lastModified?: string;
    etag?: string;
    metadata?: Record<string, any>;
}

/** Raw fetched content from a single job source page/item. */
export interface FetchedPayload {
    rawContent: string;
    contentType: 'HTML' | 'JSON' | 'XML' | 'RSS' | 'TEXT';
    url: string;
    responseHeaders?: Record<string, string>;
    checksum: string;
}

/** Interface that every connector must implement. */
export interface JobSourceConnector {
    readonly connectorType: ConnectorType;
    discoverJobs(source: IngestionSource): Promise<DiscoveredJobRef[]>;
    fetchJob(ref: DiscoveredJobRef, source: IngestionSource): Promise<FetchedPayload>;
}

// ─────────────────────────────────────────────────────────────────
// Structured Job Fields — 1:1 with public.jobs extractable columns
// ─────────────────────────────────────────────────────────────────

export interface StructuredJobFields {
    title: string;
    description: string;
    location: string;
    type: string;                        // 'Full-time', 'Part-time', 'Contract', 'Internship', 'Volunteer'
    work_mode: string;                   // 'REMOTE', 'HYBRID', 'ON_SITE'
    skills: string[];
    must_have_skills: string[];
    nice_to_have_skills: string[];
    minimum_years_experience: number;
    qualification: string | null;
    salary_range: string | null;
    deadline: string | null;             // ISO date string (YYYY-MM-DD)
    display_company_name: string;
    external_apply_url: string | null;
    apply_email: string | null;
    apply_whatsapp: string | null;
    apply_phone: string | null;
    application_instructions: string | null;
}

// ─────────────────────────────────────────────────────────────────
// Confidence Scoring — one entry per extractable field
// ─────────────────────────────────────────────────────────────────

export interface FieldConfidenceMap {
    title: number;
    description: number;
    location: number;
    type: number;
    work_mode: number;
    skills: number;
    must_have_skills: number;
    nice_to_have_skills: number;
    minimum_years_experience: number;
    qualification: number;
    salary_range: number;
    deadline: number;
    display_company_name: number;
    external_apply_url: number;
    apply_email: number;
    apply_whatsapp: number;
    apply_phone: number;
    application_instructions: number;
}

// ─────────────────────────────────────────────────────────────────
// Rule Extraction Result
// ─────────────────────────────────────────────────────────────────

export type ExtractionMethod = 'RULE_ONLY' | 'RULE_PLUS_AI' | 'AI_FULL';

export interface RuleExtractionResult {
    data: Partial<StructuredJobFields>;
    confidence: Partial<FieldConfidenceMap>;
    overallConfidence: number;             // 0–100
    extractionMethod: ExtractionMethod;
    missingFields: string[];
}

// ─────────────────────────────────────────────────────────────────
// Gemini AI Enrichment
// ─────────────────────────────────────────────────────────────────

/** Fields Gemini may return — only public.jobs extractable fields + confidence. */
export interface GeminiEnrichmentResult {
    title?: string;
    description?: string;
    location?: string;
    type?: string;
    work_mode?: string;
    skills?: string[];
    must_have_skills?: string[];
    nice_to_have_skills?: string[];
    minimum_years_experience?: number;
    qualification?: string;
    salary_range?: string;
    deadline?: string;
    display_company_name?: string;
    external_apply_url?: string;
    apply_email?: string;
    apply_whatsapp?: string;
    apply_phone?: string;
    application_instructions?: string;
    confidence_score: number;
}

// ─────────────────────────────────────────────────────────────────
// Job Intelligence (metadata only — NOT stored in public.jobs)
// ─────────────────────────────────────────────────────────────────

export interface JobIntelligenceResult {
    seniority_level: string | null;        // ENTRY, MID, SENIOR, EXECUTIVE, LEAD
    industry_category: string | null;      // Banking, Healthcare, NGO, ICT, etc.
    quality_score: number;                 // 0–100
    scam_risk_score: number;               // 0–100 (higher = more suspicious)
    normalized_skills: string[];           // Via existing normalizeSkills()
}

// ─────────────────────────────────────────────────────────────────
// Ingested Jobs Queue Status
// ─────────────────────────────────────────────────────────────────

export type IngestionQueueStatus = 'PENDING_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'REJECTED' | 'DUPLICATE';

export interface IngestedJobQueueItem {
    id: string;
    raw_payload_id: string | null;
    source_id: string;

    // Extracted job fields
    title: string;
    display_company_name: string;
    description: string;
    location: string;
    type: string;
    work_mode: string;
    skills: string[];
    must_have_skills: string[];
    nice_to_have_skills: string[];
    minimum_years_experience: number;
    qualification: string | null;
    salary_range: string | null;
    deadline: string | null;
    external_apply_url: string | null;
    apply_email: string | null;
    apply_whatsapp: string | null;
    apply_phone: string | null;
    application_instructions: string | null;
    application_method: string;
    screening_questions: ScreeningQuestion[];
    posting_type: string;
    allow_one_tap_apply: boolean;
    job_source: string | null;

    // Intelligence metadata
    extraction_method: ExtractionMethod;
    overall_confidence: number;
    field_confidence: Partial<FieldConfidenceMap>;
    ai_model_used: string | null;
    ai_tokens_used: number;
    quality_score: number;
    scam_risk_score: number;
    seniority_level: string | null;
    industry_category: string | null;

    // Duplicate detection
    dna_hash: string | null;
    source_url_hash: string | null;
    duplicate_of_job_id: string | null;
    duplicate_similarity: number | null;

    // Review
    status: IngestionQueueStatus;
    reviewed_by: string | null;
    reviewed_at: string | null;
    rejection_reason: string | null;
    published_job_id: string | null;

    created_at: string;
}

// ─────────────────────────────────────────────────────────────────
// Application Method Derivation
// ─────────────────────────────────────────────────────────────────

export function deriveApplicationMethod(
    fields: Partial<StructuredJobFields>
): string {
    if (fields.external_apply_url) return 'external_url';
    if (fields.apply_email) return 'email';
    if (fields.apply_whatsapp) return 'whatsapp';
    if (fields.apply_phone) return 'phone';
    return 'manual';
}

// ─────────────────────────────────────────────────────────────────
// Reputation Events
// ─────────────────────────────────────────────────────────────────

export type ReputationEvent =
    | 'CRAWL_SUCCESS'
    | 'HIGH_CONFIDENCE_PARSE'
    | 'CRAWL_FAILURE'
    | 'DUPLICATE_FOUND'
    | 'SPAM_DETECTED'
    | 'ADMIN_REJECTION'
    | 'ADMIN_HEAVY_CORRECTION';
