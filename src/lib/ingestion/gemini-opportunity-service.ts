/**
 * Aganyu Opportunity Ingestion Engine — Gemini Flash AI Opportunity Service
 *
 * Extracts structured Opportunity schema fields (scholarships, grants, fellowships, etc.)
 * from raw web page content or RSS descriptions.
 */

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { emitSystemEvent } from "@/lib/mission-control";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent";
const PROMPT_VERSION = "opps_v2";

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

const BLOCKED_DOMAINS = [
    "facebook.com", "fb.com", "twitter.com", "x.com", "linkedin.com",
    "instagram.com", "youtube.com", "tiktok.com", "pinterest.com",
    "wa.me", "whatsapp.com", "telegram.me", "t.me",
    "google.com", "googleapis.com", "googletagmanager.com", "gstatic.com",
    "doubleclick.net", "addthis.com", "sharethis.com",
    "gravatar.com", "wordpress.org", "schema.org", "ogp.me", "w3.org",
];

function getDomain(urlStr: string): string | null {
    try {
        return new URL(urlStr).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
        return null;
    }
}

/**
 * Extracts candidate application links from HTML (e.g. "Apply Here", "Official Link", "Application Portal")
 * and filters out the aggregator source website itself and social/analytics domains.
 */
export function extractOpportunityApplyUrlFromHtml(html: string, sourceUrl: string): string | null {
    const sourceDomain = getDomain(sourceUrl);
    
    // Scan for <a> tags with href and inner text
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    const candidates: { url: string; score: number }[] = [];

    let match;
    while ((match = linkRegex.exec(html)) !== null) {
        const rawUrl = match[1]?.trim();
        const anchorText = match[2]?.replace(/<[^>]*>/g, "").trim().toLowerCase();

        if (!rawUrl || !rawUrl.startsWith("http")) continue;

        const candidateDomain = getDomain(rawUrl);
        if (!candidateDomain) continue;

        // Reject source domain (the aggregator website where this feed article lives)
        if (sourceDomain && candidateDomain.includes(sourceDomain)) continue;
        // Reject common aggregator websites if cross-linked
        if (/opportunitiesforafricans\.com|greatyop\.com|opportunitydesk\.org|scholars4dev\.com/i.test(candidateDomain)) continue;
        // Reject social, trackers, CDN
        if (BLOCKED_DOMAINS.some(d => candidateDomain.includes(d))) continue;
        // Reject static asset URLs
        if (/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|woff|woff2|ttf|pdf)(\?|$)/i.test(rawUrl)) continue;

        let score = 0;
        if (/apply\s+now|click\s+here\s+to\s+apply|application\s+portal|online\s+application|apply\s+online|submit\s+application|apply\s+here/i.test(anchorText)) {
            score += 20;
        } else if (/official\s+link|official\s+website|programme\s+website|program\s+website|scholarship\s+link|visit\s+here/i.test(anchorText)) {
            score += 15;
        } else if (/apply|application|register|portal/i.test(anchorText)) {
            score += 10;
        }

        if (/apply|application|register|form|admissions/i.test(rawUrl)) {
            score += 5;
        }

        if (score > 0) {
            candidates.push({ url: rawUrl, score });
        }
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].url;
}

function buildOpportunityPrompt(rawText: string, sourceUrl: string): string {
    const truncated = rawText.length > 5000 ? rawText.slice(0, 5000) + '...[truncated]' : rawText;
    const sourceDomain = getDomain(sourceUrl) || "the ingestion website";

    return `You are an expert Opportunity and Scholarship data extractor for Aganyu, a platform connecting African (specifically Malawian) candidates to educational and career opportunities.

Analyze the raw web page content and extract structured opportunity information. Return valid JSON ONLY.

CRITICAL INSTRUCTIONS FOR "application_url":
- The article was fetched from aggregator/feed URL: "${sourceUrl}".
- DO NOT return "${sourceUrl}" or any URL on "${sourceDomain}" as the "application_url".
- The "application_url" must be the REAL, OFFICIAL application webpage or portal on the host institution/funder website (e.g. university portal, foundation application link, Google Form, official scholarship link).
- If you find a link labeled "Click here to Apply", "Apply Now", "Official Link", or the external institution URL, extract that destination URL.
- If no official external application URL is found in the text, return null.

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
  "application_url": "Direct link to official external application portal or null. MUST NOT BE ${sourceUrl}",
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

        // Validate application_url: Ensure it's not the ingestion source URL itself or aggregator domain
        const sourceDomain = getDomain(sourceUrl);
        const parsedDomain = parsed.application_url ? getDomain(parsed.application_url) : null;

        if (
            parsed.application_url &&
            (parsed.application_url === sourceUrl ||
             (sourceDomain && parsedDomain && (parsedDomain.includes(sourceDomain) || sourceDomain.includes(parsedDomain))) ||
             (parsedDomain && BLOCKED_DOMAINS.some(d => parsedDomain.includes(d))))
        ) {
            // Ingestion source was erroneously provided as the application url
            parsed.application_url = null;
        }

        // If Gemini didn't find the real application link, attempt HTML heuristic extraction
        if (!parsed.application_url) {
            const fallbackLink = extractOpportunityApplyUrlFromHtml(rawText, sourceUrl);
            if (fallbackLink) {
                parsed.application_url = fallbackLink;
            }
        }

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

