import { Job } from "@/types";
import { normalizeSkills } from "@/lib/skill-normalizer";

export interface SkillGapAnalysis {
    jobId: string;
    jobTitle: string;
    companyName: string;
    matchPercentage: number;
    matchedSkills: string[];
    missingMustHave: string[];
    missingNiceToHave: string[];
    qualificationMatch: boolean;
    recommendations: string[];
}

export class SkillGapService {
    static analyze(seekerSkills: string[], seekerQualification: string, job: Job): SkillGapAnalysis {
        const normalizedSeekerSkills = normalizeSkills(seekerSkills || []);
        
        const rawMustHave: string[] = Array.isArray((job as any).must_have_skills)
            ? (job as any).must_have_skills
            : (job as any).mustHaveSkills || [];
            
        const rawNiceToHave: string[] = Array.isArray((job as any).nice_to_have_skills)
            ? (job as any).nice_to_have_skills
            : (job as any).niceToHaveSkills || [];

        const normalizedMustHave = normalizeSkills(rawMustHave);
        const normalizedNiceToHave = normalizeSkills(rawNiceToHave);

        const matchedSkills: string[] = [];
        const missingMustHave: string[] = [];
        const missingNiceToHave: string[] = [];

        normalizedMustHave.forEach((skill, idx) => {
            const original = rawMustHave[idx] || skill;
            if (normalizedSeekerSkills.includes(skill)) {
                matchedSkills.push(original);
            } else {
                missingMustHave.push(original);
            }
        });

        normalizedNiceToHave.forEach((skill, idx) => {
            const original = rawNiceToHave[idx] || skill;
            if (normalizedSeekerSkills.includes(skill)) {
                if (!matchedSkills.includes(original)) matchedSkills.push(original);
            } else {
                missingNiceToHave.push(original);
            }
        });

        const totalRequired = rawMustHave.length || 1;
        const matchPercentage = Math.round((matchedSkills.length / Math.max(1, totalRequired)) * 100);

        const qualificationMatch = Boolean(seekerQualification && seekerQualification.length > 0);

        const recommendations: string[] = [];

        if (missingMustHave.length > 0) {
            recommendations.push(
                `Priority: Add or acquire expertise in mandatory skills: ${missingMustHave.slice(0, 3).join(", ")}.`
            );
        }

        if (missingNiceToHave.length > 0) {
            recommendations.push(
                `Bonus: Learning ${missingNiceToHave.slice(0, 2).join(" & ")} will make your application stand out.`
            );
        }

        if (matchedSkills.length === 0) {
            recommendations.push("Consider updating your profile skills list to better reflect your domain expertise.");
        } else {
            recommendations.push("Highlight your matched skills prominently in your bio and work experience.");
        }

        return {
            jobId: job.id,
            jobTitle: job.title,
            companyName: (job.employer as any)?.companyName || (job.employer as any)?.company_name || "Employer",
            matchPercentage: Math.min(100, matchPercentage),
            matchedSkills,
            missingMustHave,
            missingNiceToHave,
            qualificationMatch,
            recommendations
        };
    }
}
