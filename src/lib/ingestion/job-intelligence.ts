/**
 * Aganyu Job Ingestion Engine — Job Intelligence Layer
 *
 * Runs zero-cost, rule-based intelligence routines on structured jobs:
 * 1. Seniority classification
 * 2. Industry category detection
 * 3. Quality score calculation
 * 4. Scam risk detection
 * 5. Skill normalization using existing skill-normalizer.ts
 */

import { normalizeSkills } from "@/lib/skill-normalizer";
import type { StructuredJobFields, JobIntelligenceResult } from "./types";

const SENIORITY_MAP: Record<string, string[]> = {
    'EXECUTIVE': ['ceo', 'cfo', 'cto', 'coo', 'director', 'chief', 'managing director', 'country director', 'head of department'],
    'SENIOR':    ['senior', 'sr.', 'lead', 'principal', 'head of', 'team lead', 'manager', 'specialist iii'],
    'MID':       ['officer', 'specialist', 'coordinator', 'analyst', 'engineer', 'developer', 'accountant'],
    'ENTRY':     ['assistant', 'junior', 'jr.', 'trainee', 'intern', 'graduate', 'entry level', 'clerk', 'associate'],
};

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
    'Banking & Financial Services': ['bank', 'financial', 'accounting', 'audit', 'microfinance', 'insurance', 'tax', 'treasury'],
    'Healthcare & Pharmaceuticals': ['hospital', 'clinic', 'health', 'medical', 'nurse', 'doctor', 'pharmacy', 'public health'],
    'NGO & Development':           ['ngo', 'non-profit', 'united nations', 'un', 'humanitarian', 'grant', 'project officer', 'donor'],
    'ICT & Telecommunications':    ['software', 'developer', 'ict', 'it support', 'network', 'cybersecurity', 'telecom', 'data analyst'],
    'Education & Academia':        ['university', 'college', 'school', 'teacher', 'lecturer', 'academic', 'tutor', 'education'],
    'Agriculture & Forestry':      ['agriculture', 'agronomy', 'farm', 'tobacco', 'tea', 'sugar', 'crop', 'livestock'],
    'Engineering & Construction':  ['civil engineer', 'construction', 'architect', 'surveyor', 'infrastructure', 'mechanical'],
    'Logistics & Supply Chain':    ['supply chain', 'logistics', 'procurement', 'warehouse', 'transport', 'fleet'],
    'Legal & Regulatory':          ['legal', 'lawyer', 'counsel', 'compliance', 'solicitor', 'paralegal'],
    'Sales & Marketing':           ['sales', 'marketing', 'brand', 'business development', 'customer care', 'public relations'],
};

const SCAM_INDICATORS = [
    { pattern: /(?:pay|fee|deposit|registration|processing)\s*(?:fee|money|before|required|upfront)/i, score: 40 },
    { pattern: /(?:telegram|whatsapp)\s*(?:only|group|contact)/i, score: 15 },
    { pattern: /(?:earn|make)\s*(?:MWK|MK|K|USD|\$)\s*[\d,]+\s*(?:per|a)\s*(?:day|week|hour)/i, score: 25 },
    { pattern: /(?:no experience|no qualification|no degree)\s*(?:needed|required|necessary)/i, score: 15 },
    { pattern: /(?:work from home|online job).*(?:unlimited|guaranteed|easy)/i, score: 20 },
    { pattern: /(?:urgent|quick|immediate)\s*(?:cash|payout|income)/i, score: 20 },
];

export function analyzeJobIntelligence(job: Partial<StructuredJobFields>): JobIntelligenceResult {
    const text = `${job.title || ''} ${job.description || ''} ${job.qualification || ''}`.toLowerCase();

    // 1. Seniority Level
    let seniority: string | null = null;
    for (const [level, keywords] of Object.entries(SENIORITY_MAP)) {
        if (keywords.some(kw => text.includes(kw))) {
            seniority = level;
            break;
        }
    }

    // 2. Industry Category
    let industry: string | null = null;
    for (const [ind, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
        if (keywords.some(kw => text.includes(kw))) {
            industry = ind;
            break;
        }
    }

    // 3. Normalized Skills
    const rawSkills = [
        ...(job.skills || []),
        ...(job.must_have_skills || []),
        ...(job.nice_to_have_skills || []),
    ];
    const normalized_skills = normalizeSkills(rawSkills.length > 0 ? rawSkills : text);

    // 4. Quality Score
    const quality_score = calculateQualityScore(job);

    // 5. Scam Risk Score
    let scam_risk_score = 0;
    for (const indicator of SCAM_INDICATORS) {
        if (indicator.pattern.test(text)) {
            scam_risk_score += indicator.score;
        }
    }
    scam_risk_score = Math.min(scam_risk_score, 100);

    return {
        seniority_level: seniority,
        industry_category: industry,
        quality_score,
        scam_risk_score,
        normalized_skills,
    };
}

export function calculateQualityScore(job: Partial<StructuredJobFields>): number {
    let score = 0;
    if (job.title) score += 15;
    if (job.display_company_name) score += 15;
    if (job.description && job.description.length > 100) score += 15;
    if (job.location) score += 10;
    if (job.deadline) score += 10;
    if ((job.skills && job.skills.length > 0) || (job.must_have_skills && job.must_have_skills.length > 0)) score += 10;
    if (job.qualification) score += 5;
    if (job.salary_range) score += 5;
    if (job.type) score += 5;
    if (job.external_apply_url || job.apply_email || job.apply_whatsapp || job.apply_phone) score += 10;
    return Math.min(score, 100);
}
