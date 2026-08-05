/**
 * Embedding Service using Self Hosted Hetzner VPS
 * Model: sentence-transformers/all-MiniLM-L6-v2 (384 dimensions)
 */

// const EMBED_URL = process.env.EMBEDDING_URL;

export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const response = await fetch('https://ai.aganyu.com/embed', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: text
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HF API error: ${response.status}`);
        }

        const result = await response.json();

        // The feature-extraction pipeline returns a flat array or a nested array for single inputs
        if (!Array.isArray(result)) {
            throw new Error("Invalid response format from HuggingFace API.");
        }

        // Handle nested array response [[...]]
        const embedding = Array.isArray(result[0]) ? result[0] : result;

        return embedding;
    } catch (error) {
        console.error("[EmbeddingService] Error generating embedding:", error);
        throw new Error("Failed to generate semantic embedding via HuggingFace.");
    }
}

import { normalizeSkills, extractMinimumExperienceYears } from "./skill-normalizer";
import { extractCVContentSnippet } from "./cv-extractor";

/**
 * Constructs a "Professional DNA" string from seeker data to be embedded.
 * Enhanced with normalized skills, CV context, and section-weighted ordering.
 */
export function constructSeekerDNA(profile: any): string {
    const rawSkills = Array.isArray(profile.skills) ? profile.skills : (profile.skills || "").split(",");
    const normalized = normalizeSkills(rawSkills);
    const skills = normalized.length > 0 ? normalized.join(", ") : (profile.skills || []).join(", ");
    
    const certs = Array.isArray(profile.certifications) ? profile.certifications.join(", ") : (profile.certifications || "");
    const bio = profile.bio || "";
    const cvSnippet = extractCVContentSnippet(profile.resume_url, bio);
    
    const experience = (profile.experience || [])
        .map((exp: any) => `${exp.role || exp.title || "Role"} at ${exp.company || exp.employer || "Organization"}: ${exp.description || ""}`)
        .join(". ");

    return `PRIMARY PROFESSIONAL QUALIFICATIONS:
Role Title / Seniority: ${profile.seniority_level || profile.qualification || "Professional"}
Highest Qualification: ${profile.qualification || "N/A"}
Certifications & Professional Memberships: ${certs}

CORE WORK HISTORY & RESPONSIBILITIES:
${experience}
${cvSnippet}

TECHNICAL & SOFT SKILLS:
Canonical Skills: ${skills}
Professional Bio: ${bio}`;
}

/**
 * Constructs a "Job Requirement DNA" string from job data.
 * Formatted specifically to optimize semantic vector embeddings for job posts in Malawi.
 * Uses Skill Normalization and Section-Weighted Ordering.
 */
export function constructJobDNA(job: any): string {
    const rawMustHaves = job.must_have_skills || [];
    const normalizedMustHaves = normalizeSkills(rawMustHaves);
    const mustHaves = normalizedMustHaves.length > 0 ? normalizedMustHaves.join("; ") : (Array.isArray(rawMustHaves) ? rawMustHaves.join("; ") : rawMustHaves);
    
    const niceToHaves = Array.isArray(job.nice_to_have_skills) ? job.nice_to_have_skills.join("; ") : (job.nice_to_have_skills || "");
    const skills = Array.isArray(job.skills) ? job.skills.join(", ") : (job.skills || "");
    
    const expFromText = extractMinimumExperienceYears(mustHaves || job.description || "");
    const minExpYears = job.minimum_years_experience || expFromText || 0;
    const minExpStr = minExpYears > 0 ? `${minExpYears}+ years of required professional experience.` : "";
    
    const description = job.description || "";
    const qualification = job.qualification ? `Required Qualification: ${job.qualification}.` : "";

    return `PRIMARY JOB REQUIREMENTS & TITLE:
Role Title: ${job.title}
Mandatory Qualifications & Experience: ${minExpStr} ${qualification}
Key Must-Have Skills & Requirements: ${mustHaves}

JOB RESPONSIBILITIES & DUTIES:
${description}

ADDITIONAL & PREFERRED SKILLS:
General Skills: ${skills}
Nice-To-Have Skills: ${niceToHaves}`;
}

/**
 * Constructs an "Opportunity DNA" string from opportunity data.
 * Used to generate the vector embedding that powers AI candidate matching.
 */
export function constructOpportunityDNA(opportunity: any): string {
    const skills = (opportunity.required_skills || []).join(", ");
    const certs = (opportunity.required_certifications || []).join(", ");
    const description = opportunity.description || "";
    const eligibility = opportunity.eligibility_requirements || "";
    const education = opportunity.education_requirements || "";

    return `Opportunity:
Category: ${opportunity.category || ""}
Title: ${opportunity.title}
Organization: ${opportunity.organization_name || ""}
Description: ${description}
Eligibility: ${eligibility}
Education Requirements: ${education}
Required Skills: ${skills}
Required Certifications: ${certs}
Funding: ${opportunity.funding_type || ""} ${opportunity.funding_amount || ""}`;
}
