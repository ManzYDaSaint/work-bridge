import { normalizeSkills } from "./skill-normalizer";

export interface SeekerProfile {
  skills?: string[] | string | null;
  experience?: any[] | null;
  qualification?: string | null;
  certifications?: string[] | string | null;
}

export interface JobRequirements {
  must_have_skills?: string[] | string | null;
  minimum_years_experience?: number | null;
  qualification?: string | null;
  required_certifications?: string[] | string | null;
}

export interface MatchWeights {
  qualification: number;
  experience: number;
  skills: number;
  certifications: number;
}

export interface MatchCriterion<T = string | number | string[]> {
  passed: boolean;
  score: number;
  required: T;
  actual: T;
  missing?: string[];
  matched?: string[];
}

export interface StructuredMatchResult {
  passed: boolean;
  score: number;
  reasons: string[];
  breakdown: {
    qualification: MatchCriterion<string | null>;
    experience: MatchCriterion<number>;
    skills: MatchCriterion<string[]>;
    certifications: MatchCriterion<string[]>;
  };
}

export const DEFAULT_MATCH_WEIGHTS: MatchWeights = {
  qualification: 30,
  experience: 30,
  skills: 30,
  certifications: 10,
};

export function normalizeStringArray(raw?: string[] | string | null): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return normalizeSkills(raw);
  return normalizeSkills(raw.split(/[,;\n]/));
}

export function calculateYearsExperience(experience?: any[] | null): number {
  if (!Array.isArray(experience)) return 0;

  let yearsExperience = 0;
  for (const exp of experience) {
    if (!exp?.startDate) continue;
    const start = new Date(exp.startDate);
    const end = exp.endDate ? new Date(exp.endDate) : new Date();
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
    const diffYears = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    yearsExperience += Math.max(0, diffYears);
  }

  return Math.round(yearsExperience * 10) / 10;
}

export function qualificationMatches(jobQualification?: string | null, seekerQualification?: string | null): boolean {
  if (!jobQualification || !jobQualification.trim()) return true;
  if (!seekerQualification || !seekerQualification.trim()) return false;

  const jobQual = jobQualification.toLowerCase().trim();
  const seekerQual = seekerQualification.toLowerCase().trim();

  return seekerQual.includes(jobQual) || jobQual.includes(seekerQual);
}

export function requiredSkillsMatch(required?: string[] | string | null, seekerSkills?: string[] | string | null) {
  const requiredList = normalizeStringArray(required);
  const seekerList = normalizeStringArray(seekerSkills);

  const missing = requiredList.filter((skill) => !seekerList.includes(skill));
  return { passed: missing.length === 0, missing, required: requiredList, seeker: seekerList };
}

export function requiredCertificationsMatch(required?: string[] | string | null, seekerCerts?: string[] | string | null) {
  const requiredList = normalizeStringArray(required);
  const seekerList = normalizeStringArray(seekerCerts);

  const missing = requiredList.filter((cert) => !seekerList.includes(cert));
  return { passed: missing.length === 0, missing, required: requiredList, seeker: seekerList };
}

export function scoreJobSeekerMatch(
  job: JobRequirements,
  seeker: SeekerProfile,
  weights: MatchWeights = DEFAULT_MATCH_WEIGHTS
): StructuredMatchResult {
  const qualificationPassed = qualificationMatches(job.qualification, seeker.qualification);
  const qualificationScore = qualificationPassed ? 100 : 0;

  const yearsExperience = calculateYearsExperience(seeker.experience);
  const experienceRequired = job.minimum_years_experience || 0;
  const experienceScore = experienceRequired > 0
    ? Math.round(Math.min(yearsExperience / experienceRequired, 1) * 100)
    : 100;

  const skillMatch = requiredSkillsMatch(job.must_have_skills, seeker.skills);
  const skillsScore = skillMatch.required.length > 0
    ? Math.round(((skillMatch.required.length - skillMatch.missing.length) / skillMatch.required.length) * 100)
    : 100;

  const certMatch = requiredCertificationsMatch(job.required_certifications, seeker.certifications);
  const certificationsScore = certMatch.required.length > 0
    ? Math.round(((certMatch.required.length - certMatch.missing.length) / certMatch.required.length) * 100)
    : 100;

  const totalWeight = weights.qualification + weights.experience + weights.skills + weights.certifications;
  const score = Math.round(
    (qualificationScore * weights.qualification +
      experienceScore * weights.experience +
      skillsScore * weights.skills +
      certificationsScore * weights.certifications) / totalWeight
  );

  const passed = qualificationPassed &&
    (experienceRequired === 0 || yearsExperience >= experienceRequired) &&
    skillMatch.passed &&
    certMatch.passed;

  const reasons: string[] = [];
  if (!qualificationPassed) reasons.push(`Qualification requirement not met: ${job.qualification}`);
  if (experienceRequired > 0 && yearsExperience < experienceRequired) {
    reasons.push(`Needs ${experienceRequired} years experience, seeker has ${yearsExperience}`);
  }
  if (!skillMatch.passed) reasons.push(`Missing required skills: ${skillMatch.missing.join(", ")}`);
  if (!certMatch.passed) reasons.push(`Missing required certifications: ${certMatch.missing.join(", ")}`);

  return {
    passed,
    score,
    reasons,
    breakdown: {
      qualification: {
        passed: qualificationPassed,
        score: qualificationScore,
        required: job.qualification || null,
        actual: seeker.qualification || null,
      },
      experience: {
        passed: experienceRequired === 0 || yearsExperience >= experienceRequired,
        score: experienceScore,
        required: experienceRequired,
        actual: yearsExperience,
      },
      skills: {
        passed: skillMatch.passed,
        score: skillsScore,
        required: skillMatch.required,
        actual: skillMatch.seeker,
        matched: skillMatch.required.filter((skill) => skillMatch.seeker.includes(skill)),
        missing: skillMatch.missing,
      },
      certifications: {
        passed: certMatch.passed,
        score: certificationsScore,
        required: certMatch.required,
        actual: certMatch.seeker,
        matched: certMatch.required.filter((cert) => certMatch.seeker.includes(cert)),
        missing: certMatch.missing,
      },
    },
  };
}

export function passesJobHardRequirements(
  job: JobRequirements,
  seeker: SeekerProfile
): { passed: boolean; reasons: string[]; yearsExperience: number; missingSkills: string[]; missingCertifications: string[] } {
  const { passed, reasons, breakdown } = scoreJobSeekerMatch(job, seeker);
  return {
    passed,
    reasons,
    yearsExperience: breakdown.experience.actual as number,
    missingSkills: breakdown.skills.missing || [],
    missingCertifications: breakdown.certifications.missing || [],
  };
}
