/**
 * Aganyu Job Ingestion Engine — Gemini Flash AI Enrichment Service
 *
 * Called ONLY when rule-based extraction confidence is below threshold.
 * Requests ONLY missing fields — never re-extracts what rules already found.
 * Includes response caching, circuit breaker, and strict JSON validation.
 *
 * All fields requested map 1:1 to public.jobs columns.
 */

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { emitSystemEvent } from "@/lib/mission-control";
import type {
    GeminiEnrichmentResult,
    StructuredJobFields,
} from "./types";

// ─────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const PROMPT_VERSION = "v1";
const MAX_RETRIES = 1;

// Circuit breaker state (resets daily via cron or on startup)
let usageState = {
    requestsToday: 0,
    tokensToday: 0,
    dailyRequestLimit: 1500,   // Gemini free tier
    dailyTokenLimit: 1_000_000,
    circuitOpen: false,
    lastResetDate: new Date().toISOString().slice(0, 10),
};

// ─────────────────────────────────────────────────────────────────
// Prompt Template — requests ONLY public.jobs fields
// ─────────────────────────────────────────────────────────────────

function buildPrompt(
    rawText: string,
    existingFields: Partial<StructuredJobFields>,
    missingFields: string[]
): string {
    const existingStr = Object.entries(existingFields)
        .filter(([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0))
        .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
        .join('\n');

    // Truncate raw text to avoid excessive token usage
    const truncated = rawText.length > 3000 ? rawText.slice(0, 3000) + '...[truncated]' : rawText;

    return `You are a Malawian job posting data extractor. Given the raw job text and partially extracted fields below, fill ONLY the missing fields. Return valid JSON only. No explanations.

ALREADY EXTRACTED (do not change these):
${existingStr}

MISSING FIELDS TO FILL: ${missingFields.join(', ')}

RAW JOB TEXT:
${truncated}

Return JSON with ONLY these fields (use null if not found):
{
  "title": "string or null",
  "description": "string or null",
  "location": "string or null",
  "type": "Full-time | Part-time | Contract | Internship | Volunteer or null",
  "work_mode": "REMOTE | HYBRID | ON_SITE or null",
  "skills": ["array of strings"],
  "must_have_skills": ["array of strings"],
  "nice_to_have_skills": ["array of strings"],
  "minimum_years_experience": 0,
  "qualification": "string or null",
  "salary_range": "string or null",
  "deadline": "YYYY-MM-DD or null",
  "display_company_name": "string or null",
  "external_apply_url": "URL string or null",
  "apply_email": "email string or null",
  "apply_whatsapp": "phone string or null",
  "apply_phone": "phone string or null",
  "application_instructions": "string or null",
  "confidence_score": 0-100
}`;
}

// ─────────────────────────────────────────────────────────────────
// Circuit Breaker
// ─────────────────────────────────────────────────────────────────

function resetIfNewDay(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (usageState.lastResetDate !== today) {
        usageState = {
            ...usageState,
            requestsToday: 0,
            tokensToday: 0,
            circuitOpen: false,
            lastResetDate: today,
        };
    }
}

export function canCallGemini(): boolean {
    resetIfNewDay();
    if (usageState.circuitOpen) return false;
    if (usageState.requestsToday >= usageState.dailyRequestLimit * 0.8) return false;
    if (usageState.tokensToday >= usageState.dailyTokenLimit * 0.8) return false;
    return true;
}

export function getGeminiUsageStats() {
    resetIfNewDay();
    return { ...usageState };
}

// ─────────────────────────────────────────────────────────────────
// AI Response Cache
// ─────────────────────────────────────────────────────────────────

async function getCachedResult(contentHash: string): Promise<GeminiEnrichmentResult | null> {
    try {
        const supabase = getSupabaseAdminClient();
        if (!supabase) return null;

        const { data } = await supabase
            .from('ingested_ai_cache')
            .select('response')
            .eq('content_hash', contentHash)
            .eq('prompt_version', PROMPT_VERSION)
            .single();

        return (data?.response as GeminiEnrichmentResult) || null;
    } catch {
        return null;
    }
}

async function cacheResult(
    contentHash: string,
    response: GeminiEnrichmentResult,
    tokensUsed: number
): Promise<void> {
    try {
        const supabase = getSupabaseAdminClient();
        if (!supabase) return;

        await supabase.from('ingested_ai_cache').upsert({
            content_hash: contentHash,
            prompt_version: PROMPT_VERSION,
            model_version: 'gemini-2.0-flash',
            response,
            tokens_used: tokensUsed,
        }, { onConflict: 'content_hash,prompt_version' });
    } catch (err) {
        console.error('[GeminiService] Cache write failed:', err);
    }
}

// ─────────────────────────────────────────────────────────────────
// Main Enrichment Function
// ─────────────────────────────────────────────────────────────────

export async function enrichWithGemini(
    rawText: string,
    existingFields: Partial<StructuredJobFields>,
    missingFields: string[],
    contentHash: string
): Promise<{ result: GeminiEnrichmentResult | null; tokensUsed: number; fromCache: boolean }> {

    // 1. Check cache first
    const cached = await getCachedResult(contentHash);
    if (cached) {
        return { result: cached, tokensUsed: 0, fromCache: true };
    }

    // 2. Check circuit breaker
    if (!canCallGemini()) {
        await emitSystemEvent({
            category: 'AUTOMATION',
            severity: 'CRITICAL',
            event: 'INGESTION_CIRCUIT_BREAKER',
            message: 'Gemini daily quota approaching limit — circuit breaker open',
            metadata: { ...usageState },
        });
        return { result: null, tokensUsed: 0, fromCache: false };
    }

    // 3. Build prompt
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('[GeminiService] GEMINI_API_KEY not set');
        return { result: null, tokensUsed: 0, fromCache: false };
    }

    const prompt = buildPrompt(rawText, existingFields, missingFields);

    // 4. Call Gemini with retry
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 1024,
                        responseMimeType: 'application/json',
                    },
                }),
            });

            if (!response.ok) {
                if (response.status === 429) {
                    // Exponential backoff
                    const delay = Math.pow(2, attempt + 1) * 1000;
                    console.warn(`[GeminiService] Rate limited, retrying in ${delay}ms...`);
                    await new Promise(res => setTimeout(res, delay));
                    continue; 
                }
                throw new Error(`Gemini API error: ${response.status}`);
            }

            const body = await response.json();
            const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error('Empty Gemini response');

            const parsed: GeminiEnrichmentResult = JSON.parse(text);
            const tokensUsed = body.usageMetadata?.totalTokenCount || 0;

            // Update circuit breaker counters
            usageState.requestsToday++;
            usageState.tokensToday += tokensUsed;

            // Cache successful result
            await cacheResult(contentHash, parsed, tokensUsed);

            await emitSystemEvent({
                category: 'AUTOMATION',
                severity: 'INFO',
                event: 'INGESTION_GEMINI_CALLED',
                message: `Gemini enrichment completed (${missingFields.length} fields, ${tokensUsed} tokens)`,
                metadata: { contentHash, missingFields, tokensUsed, attempt },
            });

            return { result: parsed, tokensUsed, fromCache: false };

        } catch (error: any) {
            if (attempt === MAX_RETRIES) {
                console.error(`[GeminiService] All retries exhausted:`, error.message);
                await emitSystemEvent({
                    category: 'AUTOMATION',
                    severity: 'WARNING',
                    event: 'INGESTION_GEMINI_FAILED',
                    message: `Gemini enrichment failed after ${MAX_RETRIES + 1} attempts: ${error.message}`,
                    metadata: { contentHash, error: error.message },
                });
                return { result: null, tokensUsed: 0, fromCache: false };
            }
        }
    }

    return { result: null, tokensUsed: 0, fromCache: false };
}
