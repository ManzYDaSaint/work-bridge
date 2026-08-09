/**
 * Aganyu Job Ingestion Engine — Rule-Based Extraction Engine
 *
 * Lightweight, zero-cost extraction layer that handles common Malawian
 * job posting formats without any AI calls. Populates 70–80% of
 * StructuredJobFields using regex, dictionaries, and pattern matching.
 *
 * Only fields that exist in public.jobs are extracted.
 */

import { normalizeSkills, extractMinimumExperienceYears } from "@/lib/skill-normalizer";
import type {
    RuleExtractionResult,
    StructuredJobFields,
    FieldConfidenceMap,
} from "./types";

// ─────────────────────────────────────────────────────────────────
// Malawi-Specific Dictionaries
// ─────────────────────────────────────────────────────────────────

const MALAWI_LOCATIONS = [
    'Lilongwe', 'Blantyre', 'Mzuzu', 'Zomba', 'Mangochi',
    'Kasungu', 'Salima', 'Karonga', 'Nkhotakota', 'Machinga',
    'Mulanje', 'Thyolo', 'Dedza', 'Ntcheu', 'Balaka',
    'Chitipa', 'Rumphi', 'Nkhata Bay', 'Likoma', 'Phalombe',
    'Chiradzulu', 'Nsanje', 'Chikwawa', 'Mwanza', 'Neno',
    'Dowa', 'Ntchisi', 'Mchinji',
    // Regions
    'Central Region', 'Northern Region', 'Southern Region',
    // Special
    'Nationwide', 'Remote', 'Multiple Locations',
];

const TYPE_KEYWORDS: Record<string, string[]> = {
    'Full-time':  ['full-time', 'full time', 'permanent', 'regular', 'indefinite'],
    'Part-time':  ['part-time', 'part time'],
    'Contract':   ['contract', 'fixed-term', 'fixed term', 'temporary', 'consultancy', 'consultant'],
    'Internship': ['internship', 'intern', 'attachment', 'graduate trainee', 'industrial attachment'],
    'Volunteer':  ['volunteer', 'voluntary'],
};

const WORK_MODE_KEYWORDS: Record<string, string[]> = {
    'REMOTE': ['remote', 'work from home', 'home-based', 'home based', 'virtual', 'telecommute'],
    'HYBRID': ['hybrid', 'flexible location', 'partial remote'],
    'ON_SITE': ['on-site', 'on site', 'office-based', 'office based', 'in-person'],
};

const QUALIFICATION_KEYWORDS: Record<string, string[]> = {
    "PhD":                ["phd", "doctorate", "doctoral"],
    "Master's Degree":    ["master's", "masters", "msc", "mba", "ma degree", "postgraduate", "post-graduate"],
    "Bachelor's Degree":  ["bachelor's", "bachelors", "bsc", "ba degree", "undergraduate degree", "first degree", "university degree"],
    "Diploma":            ["diploma", "higher national diploma", "hnd", "advanced diploma"],
    "Certificate":        ["certificate", "professional certificate"],
    "MSCE":               ["msce", "malawi school certificate"],
};

// ─────────────────────────────────────────────────────────────────
// Regex Patterns
// ─────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+?265|0)\s*[189]\d{2}[\s-]?\d{3}[\s-]?\d{3}/g;
const WHATSAPP_PATTERN = /(?:whatsapp|wa\.me)[\s:]*(\+?[\d\s-]+)/gi;
const URL_REGEX = /https?:\/\/[^\s<>"]+/g;

const DEADLINE_PATTERNS = [
    /(?:deadline|closing\s*date|apply\s*by|applications?\s*(?:close|due|end|deadline))[\s:;]*(\d{1,2}[\s\/\-.]+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\s\/\-.]*\d{2,4})/i,
    /(\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s*,?\s*\d{4})/i,
    /(\d{4}-\d{2}-\d{2})/,
];

const SALARY_PATTERNS = [
    /(?:salary|remuneration|compensation|pay)[\s:]*([^\n.]{5,60})/i,
    /(MWK|MK|K|USD|\$|€|£)\s*[\d,]+(?:\s*[-–to]+\s*(?:MWK|MK|K|USD|\$|€|£)?\s*[\d,]+)?/i,
];

const TITLE_LABEL_PATTERNS = [
    /(?:position|job\s*title|vacancy|role|post)[\s:]+([^\n]{5,80})/i,
];

const COMPANY_LABEL_PATTERNS = [
    /(?:company|organisation|organization|employer|institution|entity)[\s:]+([^\n]{3,80})/i,
];

const HOW_TO_APPLY_PATTERN = /(?:how\s*to\s*apply|application\s*(?:procedure|process|instructions|method))[\s:]*([^]*?)(?=\n\s*\n|$)/i;

// ─────────────────────────────────────────────────────────────────
// Main Extraction Function
// ─────────────────────────────────────────────────────────────────

export function extractJobFields(
    rawText: string,
    contentType: string,
    sourceDefaults?: { defaultLocation?: string }
): RuleExtractionResult {
    const data: Partial<StructuredJobFields> = {};
    const confidence: Partial<FieldConfidenceMap> = {};
    const text = rawText || "";
    const lowerText = text.toLowerCase();

    // ── Non-Vacancy / Blog Article Filter ───────────────────────
    const NON_VACANCY_KEYWORDS = [
        'job hunting tips', 'cv stand out', 'how to write a cv', 'interview tips',
        'career advice', 'how to get a job', 'resume guide', 'write a resume',
        'top 10 jobs', 'weekly round up', 'disclaimer', 'privacy policy',
        'interview questions', 'find jobs in', 'alternative employment',
        'without a college degree', 'conduct a job search', 'transferable skills',
        'successful job search', 'no work experience', 'first job interview',
        'about job search malawi', 'search for jobs'
    ];

    const isBlogArticle = NON_VACANCY_KEYWORDS.some(kw => lowerText.includes(kw));
    if (isBlogArticle) {
        return {
            data: {
                title: cleanText(rawText.slice(0, 100)),
                description: cleanHtml(rawText),
            },
            confidence: { title: 10, description: 10 },
            overallConfidence: 10, // Force low confidence so it's skipped or flagged
            extractionMethod: 'RULE_ONLY',
            missingFields: ['title', 'display_company_name', 'description', 'deadline', 'apply_email'],
        };
    }

    // ── Title ──────────────────────────────────────────────────
    const h1Match = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(text);
    if (h1Match && h1Match[1]) {
        const cleanH1 = h1Match[1].replace(/<[^>]*>/g, '').trim();
        if (cleanH1.length > 2 && cleanH1.length < 120 && !cleanH1.includes('{') && !cleanH1.includes('width:')) {
            data.title = cleanText(cleanH1);
            confidence.title = 95;
        }
    }

    if (!data.title) {
        const titleMatch = matchLabelPattern(text, TITLE_LABEL_PATTERNS);
        if (titleMatch && !titleMatch.includes('{') && !titleMatch.includes('width:')) {
            data.title = cleanText(titleMatch);
            confidence.title = 90;
        }
    }

    if (!data.title) {
        confidence.title = 0;
    }

    // ── Description ───────────────────────────────────────────
    // For rule extraction, description is the raw text (cleaned).
    // A more sophisticated approach uses Gemini to normalize.
    if (text.length > 50) {
        data.description = cleanHtml(text);
        confidence.description = text.length > 200 ? 85 : 60;
    } else {
        confidence.description = 0;
    }

    // ── Employer / Display Company Name ───────────────────────
    const companyMatch = matchLabelPattern(text, COMPANY_LABEL_PATTERNS);
    if (companyMatch) {
        data.display_company_name = cleanText(companyMatch);
        confidence.display_company_name = 90;
    }
    if (!data.display_company_name) {
        confidence.display_company_name = 0;
    }

    // ── Location ──────────────────────────────────────────────
    const foundLocation = MALAWI_LOCATIONS.find(loc =>
        lowerText.includes(loc.toLowerCase())
    );
    if (foundLocation) {
        data.location = foundLocation;
        confidence.location = 95;
    } else if (sourceDefaults?.defaultLocation) {
        data.location = sourceDefaults.defaultLocation;
        confidence.location = 50;
    } else {
        confidence.location = 0;
    }

    // ── Employment Type ───────────────────────────────────────
    const empType = matchKeywordMap(lowerText, TYPE_KEYWORDS);
    if (empType) {
        data.type = empType;
        confidence.type = 90;
    } else {
        data.type = 'Full-time'; // Most common in Malawi
        confidence.type = 40;
    }

    // ── Work Mode ─────────────────────────────────────────────
    const workMode = matchKeywordMap(lowerText, WORK_MODE_KEYWORDS);
    if (workMode) {
        data.work_mode = workMode;
        confidence.work_mode = 90;
    } else {
        data.work_mode = 'ON_SITE'; // Default for Malawi
        confidence.work_mode = 40;
    }

    // ── Minimum Years Experience ──────────────────────────────
    const expYears = extractMinimumExperienceYears(text);
    if (expYears !== null) {
        data.minimum_years_experience = expYears;
        confidence.minimum_years_experience = 95;
    } else {
        data.minimum_years_experience = 0;
        confidence.minimum_years_experience = 50;
    }

    // ── Qualification ─────────────────────────────────────────
    let detectedQual: string | null = null;
    let qualConf = 0;

    // Evaluate levels in order of specificity
    for (const [level, keywords] of Object.entries(QUALIFICATION_KEYWORDS)) {
        const hasKeyword = keywords.some(kw => {
            const cleanKw = kw.replace(/['’]/g, "['’]?");
            const regex = new RegExp(`\\b${cleanKw}\\b`, 'i');
            return regex.test(text);
        });

        if (hasKeyword) {
            const patternStr = keywords.map(k => k.replace(/['’]/g, "['’]?")).join('|');
            const qualRegex = new RegExp(`(?:${patternStr})\\s+(?:in|of)?\\s*([a-zA-Z0-9\\s,/-]{3,80}?)(?=[.\\n;]|from|registered|with|at|$)`, 'i');
            const qualMatch = qualRegex.exec(text);

            if (qualMatch && qualMatch[1]?.trim()) {
                let rawSpec = qualMatch[1].trim().replace(/\s+/g, ' ').replace(/^(?:in|degree\s+in|degree)\s+/i, '');
                const spec = rawSpec.length > 70 ? rawSpec.slice(0, 70) + '...' : rawSpec;
                detectedQual = spec ? `${level} in ${spec}` : level;
                qualConf = 90;
            } else {
                detectedQual = level;
                qualConf = 80;
            }
            break; // Stop at highest matched qualification
        }
    }

    data.qualification = detectedQual;
    confidence.qualification = qualConf;

    // ── Skills ────────────────────────────────────────────────
    const normalized = normalizeSkills(text);
    if (normalized.length > 0) {
        data.skills = normalized;
        confidence.skills = 75;
    } else {
        data.skills = [];
        confidence.skills = 0;
    }

    // must_have / nice_to_have require semantic understanding — leave for Gemini
    data.must_have_skills = [];
    data.nice_to_have_skills = [];
    confidence.must_have_skills = 0;
    confidence.nice_to_have_skills = 0;

    // ── Salary Range ──────────────────────────────────────────
    const salaryMatch = matchFirstPattern(text, SALARY_PATTERNS);
    if (salaryMatch) {
        data.salary_range = cleanText(salaryMatch);
        confidence.salary_range = 80;
    } else {
        confidence.salary_range = 0;
    }

    // ── Deadline ──────────────────────────────────────────────
    const deadlineMatch = matchFirstPattern(text, DEADLINE_PATTERNS);
    if (deadlineMatch) {
        const parsed = parseDate(deadlineMatch);
        if (parsed) {
            data.deadline = parsed;
            confidence.deadline = 90;
        } else {
            confidence.deadline = 0;
        }
    } else {
        confidence.deadline = 0;
    }

    // ── Application URL ──────────────────────────────────────
    const urls = text.match(URL_REGEX) || [];
    const applyUrl = urls.find(u =>
        /apply|career|recruit|vacancy|job/i.test(u)
    ) || urls[0] || null;
    if (applyUrl) {
        data.external_apply_url = applyUrl;
        confidence.external_apply_url = 75;
    } else {
        confidence.external_apply_url = 0;
    }

    // ── Application Email ─────────────────────────────────────
    const emails = text.match(EMAIL_REGEX) || [];
    if (emails.length > 0) {
        data.apply_email = emails[0];
        confidence.apply_email = 85;
    } else {
        confidence.apply_email = 0;
    }

    // ── WhatsApp ──────────────────────────────────────────────
    const waMatch = WHATSAPP_PATTERN.exec(text);
    if (waMatch) {
        data.apply_whatsapp = waMatch[1].replace(/[\s-]/g, '').trim();
        confidence.apply_whatsapp = 80;
    } else {
        confidence.apply_whatsapp = 0;
    }

    // ── Phone ─────────────────────────────────────────────────
    const phones = text.match(PHONE_REGEX) || [];
    if (phones.length > 0 && phones[0]) {
        data.apply_phone = phones[0].replace(/[\s-]/g, '');
        confidence.apply_phone = 80;
    } else {
        confidence.apply_phone = 0;
    }

    // ── Application Instructions ──────────────────────────────
    const instructionsMatch = HOW_TO_APPLY_PATTERN.exec(text);
    if (instructionsMatch && instructionsMatch[1]?.trim().length > 10) {
        data.application_instructions = cleanText(instructionsMatch[1].trim().slice(0, 500));
        confidence.application_instructions = 80;
    } else {
        confidence.application_instructions = 0;
    }

    // ── Clean Description Body (Remove redundant extracted metadata) ─────
    if (data.description) {
        data.description = cleanDescriptionBody(data.description);
    }

    // ── Overall Confidence ────────────────────────────────────
    const overallConfidence = calculateOverallConfidence(confidence);
    const missingFields = Object.entries(confidence)
        .filter(([, conf]) => (conf as number) < 70)
        .map(([field]) => field);

    return {
        data,
        confidence,
        overallConfidence,
        extractionMethod: 'RULE_ONLY',
        missingFields,
    };
}

// ─────────────────────────────────────────────────────────────────
// Confidence Calculation
// ─────────────────────────────────────────────────────────────────

/**
 * Weighted overall confidence.
 * Weights reflect importance of each field to a publishable job listing.
 */
export function calculateOverallConfidence(
    fields: Partial<FieldConfidenceMap>
): number {
    const weights: Record<string, number> = {
        title: 0.15,
        display_company_name: 0.12,
        description: 0.12,
        location: 0.10,
        deadline: 0.08,
        skills: 0.08,
        type: 0.05,
        work_mode: 0.04,
        minimum_years_experience: 0.04,
        qualification: 0.04,
        salary_range: 0.03,
        external_apply_url: 0.05,
        apply_email: 0.04,
        apply_whatsapp: 0.02,
        apply_phone: 0.02,
        application_instructions: 0.02,
    };

    let score = 0;
    for (const [field, weight] of Object.entries(weights)) {
        const conf = (fields as Record<string, number>)[field] ?? 0;
        score += conf * weight;
    }
    return Math.round(score);
}

// ─────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────

function matchKeywordMap(
    lowerText: string,
    map: Record<string, string[]>
): string | null {
    for (const [value, keywords] of Object.entries(map)) {
        if (keywords.some(kw => lowerText.includes(kw))) {
            return value;
        }
    }
    return null;
}

function matchLabelPattern(text: string, patterns: RegExp[]): string | null {
    for (const pattern of patterns) {
        const match = pattern.exec(text);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    return null;
}

function matchFirstPattern(text: string, patterns: RegExp[]): string | null {
    for (const pattern of patterns) {
        const match = pattern.exec(text);
        if (match) {
            return (match[1] || match[0]).trim();
        }
    }
    return null;
}

function cleanText(text: string): string {
    return text
        .replace(/\s+/g, ' ')
        .replace(/^[^a-zA-Z0-9]+/, '')
        .trim();
}

function cleanHtml(html: string): string {
    const hasHtmlTags = /<[a-zA-Z][\s\S]*?>/i.test(html);

    if (hasHtmlTags) {
        // HTML content: convert block-level elements to newlines before stripping tags
        return html
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            // Block-level tags → newline
            .replace(/<\/?(p|div|section|article|header|footer|main|nav|ul|ol|table|tr|thead|tbody)[^>]*>/gi, '\n')
            // List items → newline + dash
            .replace(/<li[^>]*>/gi, '\n- ')
            .replace(/<\/li>/gi, '')
            // Headings → double newline
            .replace(/<\/?(h[1-6])[^>]*>/gi, '\n\n')
            // Line breaks → newline
            .replace(/<br\s*\/?>/gi, '\n')
            // Strip all remaining tags
            .replace(/<[^>]+>/g, '')
            // Decode HTML entities
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            // Collapse 3+ consecutive newlines to 2
            .replace(/\n{3,}/g, '\n\n')
            // Trim each line
            .split('\n').map(l => l.trim()).join('\n')
            .trim();
    }

    // Plain RSS/text content: use uppercase section labels as natural line-break points
    return html
        .replace(/\s*\b(VACANCY|JOB VACANCY|JOB TITLE|POSITION|COMPANY|ORGANISATION|ORGANIZATION|LOCATION|TYPE|CONTRACT|WORK MODE|DUTIES|KEY RESPONSIBILITIES|RESPONSIBILITIES|REQUIREMENTS|QUALIFICATIONS|REQUIREMENTS\s*&\s*QUALIFICATIONS|HOW TO APPLY|APPLICATION PROCESS|APPLICATION METHOD|TO APPLY|CLOSING DATE|DEADLINE)\s*:/gi,
            (match) => `\n\n${match.trim()}`)
        // Bullet-like dashes or hyphens at start of inline sections
        .replace(/ -\s+/g, '\n- ')
        .replace(/\. - /g, '.\n- ')
        // Collapse multiple spaces
        .replace(/[ \t]+/g, ' ')
        // Collapse 3+ newlines to 2
        .replace(/\n{3,}/g, '\n\n')
        .split('\n').map(l => l.trim()).join('\n')
        .trim();
}

function parseDate(dateStr: string): string | null {
    try {
        // Try ISO format first
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

        const cleaned = dateStr
            .replace(/(\d+)(?:st|nd|rd|th)/i, '$1')
            .trim();
        const parsed = new Date(cleaned);
        if (isNaN(parsed.getTime())) return null;

        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch {
        return null;
    }
}

/**
 * Strips out redundant extracted metadata headers (Title, Company, Location, Contract, Work Mode, Deadline, Apply Process)
 * from the description body so only actual role overview, responsibilities, and requirements remain.
 */
function cleanDescriptionBody(description: string): string {
    const redundantPatterns = [
        /^\s*(?:VACANCY ANNOUNCEMENT|JOB VACANCY|JOB TITLE|POSITION)\s*:\s*[^\n]+\n*/gi,
        /^\s*(?:COMPANY|ORGANISATION|ORGANIZATION)\s*:\s*[^\n]+\n*/gi,
        /^\s*LOCATION\s*:\s*[^\n]+\n*/gi,
        /^\s*(?:CONTRACT|TYPE|EMPLOYMENT TYPE)\s*:\s*[^\n]+\n*/gi,
        /^\s*WORK MODE\s*:\s*[^\n]+\n*/gi,
        /\n+\s*(?:APPLICATION PROCESS|HOW TO APPLY|APPLICATION METHOD|TO APPLY)\s*:\s*[\s\S]*?(?=\n\n|$)/gi,
        /\n+\s*(?:CLOSING DATE|DEADLINE)\s*:\s*[^\n]+\n*/gi,
    ];

    let cleaned = description;

    for (const pattern of redundantPatterns) {
        cleaned = cleaned.replace(pattern, '');
    }

    return cleaned
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

