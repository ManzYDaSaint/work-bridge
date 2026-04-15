import { JobSeeker, ScreeningAnswer, ScreeningBreakdownItem, ScreeningQuestion } from "@/types";

type ScreeningJob = {
    skills?: string[] | null;
    must_have_skills?: string[] | null;
    nice_to_have_skills?: string[] | null;
    minimum_years_experience?: number | null;
    qualification?: string | null;
    screening_questions?: ScreeningQuestion[] | null;
};

export interface ScreeningResult {
    score: number;
    meetsRequiredCriteria: boolean;
    summary: string;
    matchedSkills: string[];
    missingSkills: string[];
    yearsExperience: number;
    breakdown: ScreeningBreakdownItem[];
}

const normalize = (value?: string | null) => (value || "").trim().toLowerCase();

const uniqueNormalizedList = (values?: string[] | null) =>
    Array.from(new Map((values || []).map((value) => [normalize(value), value.trim()])).values()).filter(Boolean);

export function calculateYearsExperience(experience?: JobSeeker["experience"]): number {
    if (!experience?.length) return 0;

    const totalMs = experience.reduce((sum, item) => {
        const start = item?.startDate ? new Date(item.startDate).getTime() : NaN;
        const end = item?.endDate ? new Date(item.endDate).getTime() : Date.now();
        if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return sum;
        return sum + (end - start);
    }, 0);

    const years = totalMs / (1000 * 60 * 60 * 24 * 365.25);
    return Math.round(years * 10) / 10;
}

export function evaluateCandidateMatch(
    seeker: Pick<JobSeeker, "skills" | "experience" | "qualification">,
    job: ScreeningJob,
    answers: Record<string, ScreeningAnswer> = {}
): ScreeningResult {
    const seekerSkillMap = new Map(uniqueNormalizedList(seeker.skills).map((skill) => [normalize(skill), skill]));
    const mustHaveSkills = uniqueNormalizedList(job.must_have_skills?.length ? job.must_have_skills : job.skills);
    const niceToHaveSkills = uniqueNormalizedList(job.nice_to_have_skills);
    const matchedSkills = mustHaveSkills.filter((skill) => seekerSkillMap.has(normalize(skill)));
    const missingSkills = mustHaveSkills.filter((skill) => !seekerSkillMap.has(normalize(skill)));
    const matchedNiceToHave = niceToHaveSkills.filter((skill) => seekerSkillMap.has(normalize(skill)));
    const yearsExperience = calculateYearsExperience(seeker.experience);
    const minimumYearsExperience = Math.max(0, job.minimum_years_experience || 0);

    const requiredQualification = normalize(job.qualification);
    const candidateQualification = (seeker as any).qualification ? normalize((seeker as any).qualification) : "";

    const breakdown: ScreeningBreakdownItem[] = [];
    let meetsRequiredCriteria = true;
    let totalScore = 0;

    if (requiredQualification) {
        const qualMet = candidateQualification && (candidateQualification === requiredQualification || candidateQualification.includes(requiredQualification) || requiredQualification.includes(candidateQualification));
        if (!qualMet) meetsRequiredCriteria = false;
        totalScore += qualMet ? 20 : 0;
        breakdown.push({
            label: "Qualification",
            met: !!qualMet,
            required: true,
            detail: qualMet
                ? `Matched required qualification: ${job.qualification}`
                : `Required: ${job.qualification}. Candidate has: ${(seeker as any).qualification || "None"}`,
        });
    }

    if (mustHaveSkills.length > 0) {
        const mustHaveRatio = matchedSkills.length / mustHaveSkills.length;
        totalScore += mustHaveRatio * 60;
        const met = matchedSkills.length === mustHaveSkills.length;
        if (!met) meetsRequiredCriteria = false;
        breakdown.push({
            label: "Must-have skills",
            met,
            required: true,
            detail: matchedSkills.length
                ? `Matched ${matchedSkills.length}/${mustHaveSkills.length}: ${matchedSkills.join(", ")}`
                : `No must-have skills matched. Missing: ${missingSkills.join(", ")}`,
        });
    }

    if (niceToHaveSkills.length > 0) {
        const niceToHaveRatio = matchedNiceToHave.length / niceToHaveSkills.length;
        totalScore += niceToHaveRatio * 20;
        breakdown.push({
            label: "Nice-to-have skills",
            met: matchedNiceToHave.length > 0,
            detail: matchedNiceToHave.length
                ? `Matched ${matchedNiceToHave.length}/${niceToHaveSkills.length}: ${matchedNiceToHave.join(", ")}`
                : "No optional skills matched yet.",
        });
    }

    if (minimumYearsExperience > 0) {
        const experienceMet = yearsExperience >= minimumYearsExperience;
        if (!experienceMet) meetsRequiredCriteria = false;
        totalScore += experienceMet ? 20 : Math.max(0, (yearsExperience / minimumYearsExperience) * 20);
        breakdown.push({
            label: "Experience",
            met: experienceMet,
            required: true,
            detail: `${yearsExperience} year${yearsExperience === 1 ? "" : "s"} logged vs ${minimumYearsExperience} required`,
        });
    }

    const questions = job.screening_questions || [];
    if (questions.length > 0) {
        const questionWeight = 20 / questions.length;
        questions.forEach((question) => {
            const answer = answers[question.id];
            const met = answer === question.expectedAnswer;
            if (met) totalScore += questionWeight;
            if (question.required && !met) meetsRequiredCriteria = false;
            breakdown.push({
                label: question.question,
                met,
                required: question.required,
                detail: answer
                    ? `Candidate answered ${answer.toLowerCase()}, expected ${question.expectedAnswer.toLowerCase()}`
                    : "No answer provided.",
            });
        });
    }

    const roundedScore = Math.max(0, Math.min(100, Math.round(totalScore)));
    const summaryParts = [
        `${matchedSkills.length}/${mustHaveSkills.length || 0} must-have skills matched`,
        minimumYearsExperience > 0 ? `${yearsExperience}/${minimumYearsExperience} years experience` : null,
        questions.length > 0
            ? `${questions.filter((question) => answers[question.id] === question.expectedAnswer).length}/${questions.length} screening checks passed`
            : null,
    ].filter(Boolean);

    return {
        score: roundedScore,
        meetsRequiredCriteria,
        summary: summaryParts.join(" • "),
        matchedSkills,
        missingSkills,
        yearsExperience,
        breakdown,
    };
}
