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

/**
 * New scoring weights — Qualification is the primary gate in Malawian recruitment.
 * Skills evaluated semantically via Gemini LLM in the orchestrator.
 */
export const DEFAULT_MATCH_WEIGHTS: MatchWeights = {
  qualification: 80,
  experience: 10,
  skills: 10,
  certifications: 0,
};

/**
 * Educational Hierarchy Levels for Malawian Recruitment Context:
 * 7: PhD / Doctorate
 * 6: Master's / MSc / MA / MBA
 * 5: Bachelor's Degree / Degree / BSc / BA / BCom
 * 4: Advanced Diploma / Higher Diploma
 * 3: Diploma
 * 2: Certificate
 * 1: MSCE / High School / O-Level
 */
export function getQualificationRank(qualString?: string | null): number {
  if (!qualString || !qualString.trim()) return 0;
  const q = qualString.toLowerCase();

  if (q.includes("phd") || q.includes("doctorate")) return 7;
  if (q.includes("master") || q.includes("msc") || q.includes("mba") || q.includes("ma ")) return 6;
  if (q.includes("bachelor") || q.includes("degree") || q.includes("bsc") || q.includes("bcom") || q.includes("ba ")) return 5;
  if (q.includes("advanced diploma") || q.includes("higher diploma") || q.includes("adv. diploma")) return 4;
  if (q.includes("diploma")) return 3;
  if (q.includes("certificate") || q.includes("cert ")) return 2;
  if (q.includes("msce") || q.includes("high school") || q.includes("o-level") || q.includes("secondary")) return 1;

  return 0;
}

export function evaluateQualificationMatch(
  jobQualification?: string | null,
  seekerQualification?: string | null
): { passed: boolean; score: number } {
  if (!jobQualification || !jobQualification.trim()) {
    return { passed: true, score: 100 };
  }
  if (!seekerQualification || !seekerQualification.trim()) {
    return { passed: false, score: 0 };
  }

  const jobQualLower = jobQualification.toLowerCase().trim();
  const seekerQualLower = seekerQualification.toLowerCase().trim();

  // 1. Direct or Substring match check
  if (seekerQualLower.includes(jobQualLower) || jobQualLower.includes(seekerQualLower)) {
    return { passed: true, score: 100 };
  }

  // 2. Malawian Hierarchy Rank Evaluation
  const jobRank = getQualificationRank(jobQualification);
  const seekerRank = getQualificationRank(seekerQualification);

  if (jobRank > 0 && seekerRank > 0) {
    if (seekerRank >= jobRank) {
      // Equal or higher qualification (e.g. Master's for a Bachelor's job)
      return { passed: true, score: 100 };
    }
    if (seekerRank === jobRank - 1) {
      // 1 level below (e.g. Diploma for a Bachelor's job) → Partial (40%)
      return { passed: false, score: 40 };
    }
    // 2+ levels below → Knockout (0%)
    return { passed: false, score: 0 };
  }

  return { passed: false, score: 0 };
}

export function qualificationMatches(jobQualification?: string | null, seekerQualification?: string | null): boolean {
  return evaluateQualificationMatch(jobQualification, seekerQualification).passed;
}

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

export function requiredSkillsMatch(required?: string[] | string | null, seekerSkills?: string[] | string | null) {
  const requiredList = normalizeStringArray(required);
  const seekerList = normalizeStringArray(seekerSkills);

  const missing = requiredList.filter((skill) => !seekerList.includes(skill));
  return { passed: missing.length === 0, missing, required: requiredList, seeker: seekerList };
}

export function requiredCertificationsMatch(required?: string[] | string | null, seekerCerts?: string[] | string | null) {
  const requiredList = normalizeStringArray(required);
  const seekerList = normalizeStringArray(seekerCerts || []);

  const missing = requiredList.filter((cert) => !seekerList.includes(cert));
  return { passed: missing.length === 0, missing, required: requiredList, seeker: seekerList };
}

/**
 * Rule-based scoring only (no LLM).
 * Weights: Qualification=80%, Experience=10%, Skills=10%
 * Skills here are exact/normalized matches — for semantic LLM scoring use scoreJobSeekerMatchWithLLM.
 */
export function scoreJobSeekerMatch(
  job: JobRequirements,
  seeker: SeekerProfile,
  weights: MatchWeights = DEFAULT_MATCH_WEIGHTS
): StructuredMatchResult {
  const qualEval = evaluateQualificationMatch(job.qualification, seeker.qualification);
  const qualificationPassed = qualEval.passed;
  const qualificationScore = qualEval.score;

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
