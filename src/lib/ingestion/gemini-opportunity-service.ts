/**
 * Aganyu Opportunity Ingestion Engine — Gemini Flash AI Opportunity Service
 *
 * Extracts structured Opportunity schema fields (scholarships, grants, fellowships, etc.)
 * from raw web page content or RSS descriptions.
 */

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { emitSystemEvent } from "@/lib/mission-control";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent";
const PROMPT_VERSION = "opps_v1";

export interface ExtractedOpportunityFields {
    title: string;
    organization_name: string;
    host_institutions: string[];
    category: "SCHOLARSHIP" | "GRANT" | "FUNDING" | "TRAINING" | "CERTIFICATION" | "FELLOWSHIP" | "INTERNSHIP" | "CAREER_PROGRAM";
    funding_type: "FULL_FUNDING" | "PARTIAL_FUNDING" | "STIPEND" | "UNPAID" | "NOT_APPLICABLE";
    funding_amount?: string | null;
    country: string;
    target_regions: string[];
    gender_eligibility: "ANY" | "WOMEN_ONLY" | "MEN_ONLY";
    deadline?: string | null; // YYYY-MM-DD
    eligibility_requirements?: string | null;
    education_requirements?: string | null;
    experience_years_min?: number;
    application_url?: string | null;
    short_description?: string | null;
    description?: string | null;
    confidence_score: number;
}

function buildOpportunityPrompt(rawText: string, sourceUrl: string): string {
    const truncated = rawText.length > 3500 ? rawText.slice(0, 3500) + '...[truncated]' : rawText;

    return `You are an expert Opportunity and Scholarship data extractor for Aganyu, a platform connecting African (specifically Malawian) candidates to educational and career opportunities.

Analyze the raw web page content from ${sourceUrl} and extract structured opportunity information. Return valid JSON ONLY.

RAW CONTENT:
${truncated}

Output JSON schema format:
{
  "title": "Full name of the scholarship or opportunity",
  "organization_name": "Sponsoring body/organization e.g. Chevening, MasterCard Foundation, DAAD, European Union",
  "host_institutions": ["Array of host universities or institutions if listed, e.g. Stellenbosch University"],
  "category": "SCHOLARSHIP | GRANT | FUNDING | TRAINING | CERTIFICATION | FELLOWSHIP | INTERNSHIP | CAREER_PROGRAM",
  "funding_type": "FULL_FUNDING | PARTIAL_FUNDING | STIPEND | UNPAID | NOT_APPLICABLE",
  "funding_amount": "Summary of benefits e.g. Full tuition, monthly stipend, travel allowance or null",
  "country": "Primary study or host country e.g. United Kingdom, Germany, Pan-Africa, Global",
  "target_regions": ["Array of eligible applicant countries or regions e.g. Malawi, Africa, Developing Countries, Global"],
  "gender_eligibility": "ANY | WOMEN_ONLY | MEN_ONLY",
  "deadline": "Closing date ISO string format YYYY-MM-DD or null if unspecified",
  "eligibility_requirements": "Bullet points or concise paragraph of eligibility requirements",
  "education_requirements": "Required degree level e.g. Undergraduate, Bachelor's degree, Master's degree",
  "experience_years_min": 0,
  "application_url": "Direct link to official application page or null",
  "short_description": "2-3 sentence overview summary of the opportunity",
  "description": "Full clean text detailed description stripped of website boilerplate",
  "confidence_score": 0-100
}`;
}

export async function parseOpportunityWithGemini(
    rawText: string,
    sourceUrl: string,
    contentHash: string
): Promise<ExtractedOpportunityFields | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('[GeminiOpportunityService] GEMINI_API_KEY not set');
        return null;
    }

    try {
        const supabase = getSupabaseAdminClient();
        if (supabase) {
            const { data } = await supabase
                .from('ingested_ai_cache')
                .select('response')
                .eq('content_hash', contentHash)
                .eq('prompt_version', PROMPT_VERSION)
                .single();

            if (data?.response) {
                return data.response as ExtractedOpportunityFields;
            }
        }

        const prompt = buildOpportunityPrompt(rawText, sourceUrl);
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 1500,
                    responseMimeType: 'application/json',
                },
            }),
        });

        if (!response.ok) {
            console.error(`[GeminiOpportunityService] API error ${response.status}`);
            return null;
        }

        const body = await response.json();
        const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) return null;

        const parsed: ExtractedOpportunityFields = JSON.parse(text);

        // Reject low-confidence extractions (e.g. list-style digest posts have confidence ~0)
        if (!parsed.title || (parsed.confidence_score !== undefined && parsed.confidence_score < 30)) {
            console.warn(`[GeminiOpportunityService] Skipping low-confidence extraction (score=${parsed.confidence_score}) for ${sourceUrl}`);
            return null;
        }

        if (!parsed.application_url) parsed.application_url = sourceUrl;
        if (!parsed.target_regions || parsed.target_regions.length === 0) parsed.target_regions = ['GLOBAL'];
        if (!parsed.host_institutions) parsed.host_institutions = [];

        if (supabase) {
            await supabase.from('ingested_ai_cache').upsert({
                content_hash: contentHash,
                prompt_version: PROMPT_VERSION,
                model_version: 'gemini-3.1-flash-lite',
                response: parsed,
                tokens_used: body.usageMetadata?.totalTokenCount || 0,
            }, { onConflict: 'content_hash,prompt_version' });
        }

        await emitSystemEvent({
            category: 'AUTOMATION',
            severity: 'INFO',
            event: 'OPPORTUNITY_GEMINI_PARSED',
            message: `Parsed opportunity: ${parsed.title || 'Untitled'}`,
            metadata: { sourceUrl, category: parsed.category, fundingType: parsed.funding_type },
        });

        return parsed;

    } catch (err: any) {
        console.error('[GeminiOpportunityService] Extraction failed:', err.message);
        return null;
    }
}

