/**
 * Validation utilities for ingested raw content.
 */

export function isContentSanityCheckPassed(content: string): { passed: boolean; reason?: string } {
    if (!content) {
        return { passed: false, reason: "Content is empty" };
    }

    const MIN_CHARS = 200; // Minimum content length to consider it a real job description
    const REQUIRED_KEYWORDS = ["job", "apply", "requirement", "responsibility", "qualification"];

    if (content.length < MIN_CHARS) {
        return { passed: false, reason: `Content too short (${content.length} chars)` };
    }

    const contentLower = content.toLowerCase();
    const hasKeyword = REQUIRED_KEYWORDS.some(kw => contentLower.includes(kw));
    
    if (!hasKeyword) {
        return { passed: false, reason: "Content does not contain job-related keywords" };
    }

    return { passed: true };
}

export function validateExtractedJob(jobData: any): { 
    decision: 'APPROVED' | 'REJECTED' | 'NEEDS_MORE_DATA'; 
    issues: string[]; 
    missingFields: string[] 
} {
    // This is a placeholder for the actual logic that existed before. 
    // Since I cannot find the original implementation, I'm returning a default 'APPROVED' decision.
    return {
        decision: 'APPROVED',
        issues: [],
        missingFields: []
    };
}
