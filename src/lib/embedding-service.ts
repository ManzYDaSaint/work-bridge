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

/**
 * Constructs a "Professional DNA" string from seeker data to be embedded.
 */
export function constructSeekerDNA(profile: any): string {
    const skills = (profile.skills || []).join(", ");
    const bio = profile.bio || "";
    const experience = (profile.experience || [])
        .map((exp: any) => `${exp.role} at ${exp.company}: ${exp.description}`)
        .join(". ");

    return `Professional Profile:
Bio: ${bio}
Skills: ${skills}
Experience: ${experience}
Qualification: ${profile.qualification || "N/A"}`;
}

/**
 * Constructs a "Job Requirement DNA" string from job data.
 */
export function constructJobDNA(job: any): string {
    const mustHaves = (job.must_have_skills || []).join(", ");
    const niceToHaves = (job.nice_to_have_skills || []).join(", ");
    const description = job.description || "";

    return `Job Requirements:
Title: ${job.title}
Must-have Skills: ${mustHaves}
Nice-to-have Skills: ${niceToHaves}
Description: ${description}`;
}
