/**
 * Profile Strength Utility
 * Calculates the completion percentage of a job seeker's profile
 * and provides actionable suggestions for improvement.
 */

export interface ProfileStrengthResult {
    percentage: number;
    suggestions: string[];
    isComplete: boolean;
}

export function calculateProfileStrength(profile: any): ProfileStrengthResult {
    if (!profile) {
        return { percentage: 0, suggestions: ["Create your profile to get started!"], isComplete: false };
    }

    const checks = [
        {
            id: "bio",
            label: "Professional Bio",
            check: () => !!profile.bio && profile.bio.length > 20,
            suggestion: "Write a detailed bio to tell employers about yourself.",
        },
        {
            id: "location",
            label: "Location",
            check: () => !!profile.location,
            suggestion: "Add your location so employers know where you are based.",
        },
        {
            id: "skills",
            label: "Skills",
            check: () => Array.isArray(profile.skills) && profile.skills.length >= 3,
            suggestion: "Add at least 3 key skills to improve your matchmaking score.",
        },
        {
            id: "experience",
            label: "Work Experience",
            check: () => Array.isArray(profile.experience) && profile.experience.length > 0,
            suggestion: "Add your professional experience or internships.",
        },
        {
            id: "education",
            label: "Education",
            check: () => Array.isArray(profile.education) && profile.education.length > 0,
            suggestion: "Add your educational background and qualifications.",
        },
        {
            id: "portfolio",
            label: "Portfolio Links",
            check: () => Array.isArray(profile.portfolio_links) && profile.portfolio_links.length > 0,
            suggestion: "Link your portfolio or GitHub to showcase your work.",
        },
        {
            id: "resume",
            label: "Resume Upload",
            check: () => !!profile.resume_url,
            suggestion: "Upload your latest resume for a complete application.",
        },
        {
            id: "avatar",
            label: "Profile Picture",
            check: () => !!profile.avatar_url,
            suggestion: "Upload a professional photo to build trust with employers.",
        },
    ];

    const passedChecks = checks.filter(c => c.check()).length;
    const failedChecks = checks.filter(c => !c.check());
    
    const percentage = Math.round((passedChecks / checks.length) * 100);
    const suggestions = failedChecks.map(c => c.suggestion);

    return {
        percentage,
        suggestions,
        isComplete: percentage === 100,
    };
}
