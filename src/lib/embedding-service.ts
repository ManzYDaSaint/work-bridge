/**
 * Embedding Service using in-process ONNX pipeline (@xenova/transformers)
 * Model: Xenova/all-MiniLM-L6-v2 (384 dimensions)
 * 100% compatible with sentence-transformers/all-MiniLM-L6-v2 and existing pgvector storage.
 */

// Global singleton pipeline reference to avoid reloading model on every request
let pipelinePromise: Promise<any> | null = null;

async function getEmbeddingPipeline() {
    if (!pipelinePromise) {
        pipelinePromise = (async () => {
            const { pipeline, env } = await import("@xenova/transformers");
            // Allow remote downloads when cache is missing
            env.allowRemoteModels = true;
            return pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
        })();
    }
    return pipelinePromise;
}

export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const extractor = await getEmbeddingPipeline();
        const output = await extractor(text, {
            pooling: "mean",
            normalize: true,
        });

        // output.data is a Float32Array of 384 numbers
        const embedding = Array.from(output.data) as number[];
        return embedding;
    } catch (localError) {
        console.warn("[EmbeddingService] Local inference failed, checking fallback:", localError);

        // Fallback: If EMBEDDING_URL is defined, attempt remote VPS call
        const fallbackUrl = process.env.EMBEDDING_URL;
        if (fallbackUrl) {
            try {
                const response = await fetch(fallbackUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ inputs: text }),
                });

                if (response.ok) {
                    const result = await response.json();
                    if (Array.isArray(result)) {
                        return Array.isArray(result[0]) ? result[0] : result;
                    }
                }
            } catch (vpsError) {
                console.error("[EmbeddingService] Remote fallback also failed:", vpsError);
            }
        }

        const rootCause = localError instanceof Error ? localError.message : String(localError);
        throw new Error(`Failed to generate semantic embedding: ${rootCause}`);
    }
}


import { normalizeSkills, extractMinimumExperienceYears } from "./skill-normalizer";

/**
 * Constructs a "Professional DNA" string from seeker data to be embedded.
 * Enhanced with normalized skills, CV context, and section-weighted ordering.
 */
export function constructSeekerDNA(profile: any): string {
    const rawSkills = Array.isArray(profile.skills) ? profile.skills : (profile.skills || "").split(",");
    const normalized = normalizeSkills(rawSkills);
    const skills = normalized.length > 0 ? normalized.join(", ") : (Array.isArray(profile.skills) ? profile.skills.join(", ") : (profile.skills || ""));
    
    const rawCerts = Array.isArray(profile.certifications) ? profile.certifications : (profile.certifications || "");
    const normalizedCerts = normalizeSkills(rawCerts);
    const certs = normalizedCerts.length > 0 ? normalizedCerts.join(", ") : (Array.isArray(profile.certifications) ? profile.certifications.join(", ") : (profile.certifications || ""));
    const bio = profile.bio || "";
    
    const experience = (profile.experience || [])
        .map((exp: any) => `${exp.role || exp.title || "Role"} at ${exp.company || exp.employer || "Organization"}: ${exp.description || ""}`)
        .join(". ");

    const educationText = Array.isArray(profile.education)
        ? profile.education
            .map((entry: any) => entry?.certificate || entry?.degree || entry?.qualification || entry?.programme || entry?.program || "")
            .filter(Boolean)
            .join("; ")
        : "";
    const highestQualification = educationText || profile.qualification || "N/A";

    return `PRIMARY PROFESSIONAL QUALIFICATIONS:
Role Title / Seniority: ${profile.seniority_level || profile.qualification || "Professional"}
Highest Qualification: ${highestQualification}
Certifications & Professional Memberships: ${certs}

CORE WORK HISTORY & RESPONSIBILITIES:
${experience}

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
    
    const rawNiceToHaves = job.nice_to_have_skills || [];
    const normalizedNiceToHaves = normalizeSkills(rawNiceToHaves);
    const niceToHaves = normalizedNiceToHaves.length > 0 ? normalizedNiceToHaves.join("; ") : (Array.isArray(rawNiceToHaves) ? rawNiceToHaves.join("; ") : rawNiceToHaves);
    const rawSkills = Array.isArray(job.skills) ? job.skills : (job.skills || []);
    const normalizedSkills = normalizeSkills(rawSkills);
    const skills = normalizedSkills.length > 0 ? normalizedSkills.join(", ") : (Array.isArray(rawSkills) ? rawSkills.join(", ") : rawSkills);
    
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
