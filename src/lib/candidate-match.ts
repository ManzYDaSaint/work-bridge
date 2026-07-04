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
    screeningAnswers: Record<string, any>,
    semanticSimilarity?: number
): CandidateMatchResult {
    const seekerSkills = (seeker.skills || []).map(s => s.toLowerCase().trim());
    const mustHave = (job.must_have_skills || []).map(s => s.toLowerCase().trim());
    const niceToHave = (job.nice_to_have_skills || []).map(s => s.toLowerCase().trim());

    // 1. Skill Matching
    const matchedMustHaves: string[] = [];
    const missingMustHaves: string[] = [];
    for (const skill of mustHave) {
        if (seekerSkills.includes(skill)) matchedMustHaves.push(skill);
        else missingMustHaves.push(skill);
    }

    const matchedNiceToHaves: string[] = [];
    for (const skill of niceToHave) {
        if (seekerSkills.includes(skill)) matchedNiceToHaves.push(skill);
    }

    // 2. Experience Calculation
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

    // 3. Screening & Criteria Validation
    let meetsRequiredCriteria = true;
    const breakdown: any[] = [];

    // Experience Check
    const reqExp = job.minimum_years_experience || 0;
    const expPassed = yearsExperience >= reqExp;
    if (!expPassed) meetsRequiredCriteria = false;
    breakdown.push({
        type: "EXPERIENCE",
        passed: expPassed,
        message: expPassed 
            ? `Meets experience requirement (${yearsExperience}/${reqExp} years).`
            : `Requires ${reqExp} years, candidate has ${yearsExperience}.`,
    });

    // Qualification Check
    let qualPassed = true;
    if (job.qualification && job.qualification.trim()) {
        const jobQual = job.qualification.toLowerCase().trim();
        const seekerQual = (seeker.qualification || "").toLowerCase().trim();
        if (!seekerQual.includes(jobQual)) {
            qualPassed = false;
            meetsRequiredCriteria = false;
        }
    }
    breakdown.push({
        type: "QUALIFICATION",
        passed: qualPassed,
        message: qualPassed ? "Meets qualification requirement." : `Missing required qualification: ${job.qualification}`,
    });

    // Screening Questions
    const screeningQuestions = Array.isArray(job.screening_questions) ? job.screening_questions : [];
    for (const question of screeningQuestions) {
        if (question.required) {
            const answerObj = screeningAnswers[question.id];
            const answerValue = typeof answerObj === "object" && answerObj !== null ? answerObj.answer : answerObj;
            const expected = (question.expectedAnswer || "YES").toLowerCase().trim();
            const actual = String(answerValue || "").toLowerCase().trim();
            const passed = actual === expected;
            if (!passed) meetsRequiredCriteria = false;
            breakdown.push({
                type: "SCREENING",
                questionId: question.id,
                passed,
                message: passed ? "Passed screening question." : `Failed: ${question.question}`,
            });
        }
    }

    // 4. Weighted Scoring Calculation
    // Must-Haves (40%) - Hard requirement match
    const mustHaveScore = mustHave.length > 0 
        ? (matchedMustHaves.length / mustHave.length) * 40 
        : 40;

    // Semantic & Nice-to-Haves (60%)
    // If we have AI semantic similarity, it becomes the primary driver for the 'fit' score.
    let fitScore = 0;
    if (semanticSimilarity !== undefined) {
        // Semantic similarity is typically 0.0 to 1.0. We scale it to 60 points.
        fitScore = semanticSimilarity * 60;
    } else {
        // Fallback to keyword-based Nice-to-Haves (30%) and Context (30%)
        const niceToHaveScore = niceToHave.length > 0 
            ? (matchedNiceToHaves.length / niceToHave.length) * 30 
            : 30;
        const contextScore = (expPassed && qualPassed) ? 30 : 0;
        fitScore = niceToHaveScore + contextScore;
    }

    const score = Math.round(mustHaveScore + fitScore);

    // 5. Smart Justification Generation
    let summary = "";
    if (matchedMustHaves.length === mustHave.length && mustHave.length > 0) {
        summary = `Strong Match: Meets all critical requirements`;
        if (matchedNiceToHaves.length > 0) {
            summary += ` and has ${matchedNiceToHaves.length} bonus skills.`;
        } else {
            summary += ".";
        }
    } else if (matchedMustHaves.length > 0) {
        summary = `Partial Match: Matches ${matchedMustHaves.length}/${mustHave.length} critical skills.`;
    } else {
        summary = `Low Match: Missing core technical requirements.`;
    }

    if (!meetsRequiredCriteria) {
        summary = `Criteria Gap: ${summary} (Does not meet all mandatory screening/experience rules).`;
    }

    return {
        score,
        meetsRequiredCriteria,
        summary,
        breakdown,
        matchedSkills: [...matchedMustHaves, ...matchedNiceToHaves],
        missingSkills: missingMustHaves,
        yearsExperience,
    };
}
