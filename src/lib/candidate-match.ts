export interface CandidateMatchResult {
    score: number;
    meetsRequiredCriteria: boolean;
    summary: string;
    breakdown: any[];
    matchedSkills: string[];
    missingSkills: string[];
    yearsExperience: number;
}

export function evaluateCandidateMatch(
    seeker: {
        skills: string[];
        experience: any[];
        qualification: string | null;
    },
    job: {
        must_have_skills?: string[];
        nice_to_have_skills?: string[];
        minimum_years_experience?: number;
        qualification?: string | null;
        screening_questions?: any;
    },
    screeningAnswers: Record<string, any>
): CandidateMatchResult {
    const seekerSkills = (seeker.skills || []).map(s => s.toLowerCase().trim());
    const mustHave = (job.must_have_skills || []).map(s => s.toLowerCase().trim());
    const niceToHave = (job.nice_to_have_skills || []).map(s => s.toLowerCase().trim());

    // 1. Skill Matching
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    for (const skill of mustHave) {
        if (seekerSkills.includes(skill)) {
            matchedSkills.push(skill);
        } else {
            missingSkills.push(skill);
        }
    }

    // 2. Experience Matching (simplified calculation)
    let yearsExperience = 0;
    if (Array.isArray(seeker.experience)) {
        for (const exp of seeker.experience) {
            if (exp.startDate) {
                const start = new Date(exp.startDate);
                const end = exp.endDate ? new Date(exp.endDate) : new Date();
                const diffYears = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
                yearsExperience += Math.max(0, diffYears);
            }
        }
    }
    yearsExperience = Math.round(yearsExperience * 10) / 10;

    // 3. Screening Questions & Required Criteria
    let meetsRequiredCriteria = true;
    const breakdown: any[] = [];

    const reqExp = job.minimum_years_experience || 0;
    if (yearsExperience < reqExp) {
        meetsRequiredCriteria = false;
        breakdown.push({
            type: "EXPERIENCE",
            passed: false,
            message: `Requires ${reqExp} years of experience, candidate has ${yearsExperience} years.`,
        });
    } else {
        breakdown.push({
            type: "EXPERIENCE",
            passed: true,
            message: `Meets experience requirement (${yearsExperience}/${reqExp} years).`,
        });
    }

    // Verify qualification
    if (job.qualification && job.qualification.trim()) {
        const jobQual = job.qualification.toLowerCase().trim();
        const seekerQual = (seeker.qualification || "").toLowerCase().trim();
        if (!seekerQual.includes(jobQual)) {
            meetsRequiredCriteria = false;
            breakdown.push({
                type: "QUALIFICATION",
                passed: false,
                message: `Requires qualification: "${job.qualification}".`,
            });
        } else {
            breakdown.push({
                type: "QUALIFICATION",
                passed: true,
                message: `Meets qualification requirement.`,
            });
        }
    }

    // Verify screening questions
    const screeningQuestions = Array.isArray(job.screening_questions)
        ? job.screening_questions
        : [];

    for (const question of screeningQuestions) {
        if (question.required) {
            const answerObj = screeningAnswers[question.id];
            const answerValue = typeof answerObj === "object" && answerObj !== null ? answerObj.answer : answerObj;
            const expected = (question.expectedAnswer || "YES").toLowerCase().trim();
            const actual = String(answerValue || "").toLowerCase().trim();
            
            const passed = actual === expected;
            if (!passed) {
                meetsRequiredCriteria = false;
            }
            breakdown.push({
                type: "SCREENING",
                questionId: question.id,
                passed,
                message: passed ? `Passed screening question.` : `Failed screening question: ${question.question}`,
            });
        }
    }

    // Calculate score
    const totalMustHave = mustHave.length;
    const skillsScore = totalMustHave > 0 ? (matchedSkills.length / totalMustHave) * 60 : 60;
    const screeningScore = meetsRequiredCriteria ? 40 : 10;
    const score = Math.round(skillsScore + screeningScore);

    const summary = meetsRequiredCriteria
        ? `Candidate meets all basic eligibility criteria and matches ${matchedSkills.length}/${totalMustHave} required skills.`
        : `Candidate does not meet all required screening criteria.`;

    return {
        score,
        meetsRequiredCriteria,
        summary,
        breakdown,
        matchedSkills,
        missingSkills,
        yearsExperience,
    };
}
