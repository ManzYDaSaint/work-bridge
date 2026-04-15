/**
 * Logic for matching Job Seekers with Jobs based on skills and profiles.
 */

export interface MatchScore {
    score: number; // 0 to 100
    matchedSkills: string[];
    missingSkills: string[];
    subScores: {
        skills: number;
        keywords: number;
        potential: number;
    };
}

export function calculateMatchScore(
    seekerSkills: string[] = [],
    jobSkills: string[] = [],
    seekerBio: string = "",
    jobDescription: string = ""
): MatchScore {
    if (jobSkills.length === 0) return {
        score: 100,
        matchedSkills: [],
        missingSkills: [],
        subScores: { skills: 100, keywords: 0, potential: 0 }
    };

    const normalizedSeekerSkills = seekerSkills.map(s => s.toLowerCase());
    const matchedSkills = jobSkills.filter(s => normalizedSeekerSkills.includes(s.toLowerCase()));
    const missingSkills = jobSkills.filter(s => !normalizedSeekerSkills.includes(s.toLowerCase()));

    // Skill-based score (70% weight)
    let skillScore = (matchedSkills.length / jobSkills.length) * 70;

    // Keyword matching in bio/description (30% weight)
    const bioWords = seekerBio.toLowerCase();
    let keywordScore = 0;
    if (seekerBio) {
        const foundInBio = jobSkills.filter(s => bioWords.includes(s.toLowerCase()));
        keywordScore = (foundInBio.length / jobSkills.length) * 30;
    }

    // Potential score (Soft calculation based on relative overlap)
    const potential = Math.min(100, (skillScore + keywordScore) * 1.2);

    return {
        score: Math.round(skillScore + keywordScore),
        matchedSkills,
        missingSkills,
        subScores: {
            skills: Math.round(skillScore),
            keywords: Math.round(keywordScore),
            potential: Math.round(potential)
        }
    };
}
