export interface SeekerProfile {
  skills?: string[] | string | null;
  experience?: any[] | null;
  qualification?: string | null;
  education?: Array<Record<string, any>> | null;
  certifications?: string[] | string | null;
}

export interface JobRequirements {
  title?: string | null;
  must_have_skills?: string[] | string | null;
  minimum_years_experience?: number | null;
  qualification?: string | null;
  required_certifications?: string[] | string | null;
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

export interface MatchCriterion<T = string | number | string[]> {
  passed: boolean;
  score: number;
  required: T;
  actual: T;
  missing?: string[];
  matched?: string[];
}

export interface MatchWeights {
  qualification: number;
  experience: number;
  skills: number;
  certifications: number;
}

export const DEFAULT_MATCH_WEIGHTS: MatchWeights = {
  qualification: 80,
  experience: 10,
  skills: 10,
  certifications: 0,
};

export function getQualificationRank(qualString?: string | null): number {
  if (!qualString || !qualString.trim()) return 0;
  const q = qualString.toLowerCase();

  if (q.includes("phd") || q.includes("doctorate")) return 7;
  if (q.match(/\bmaster\b/) || q.match(/\bmsc\b/) || q.match(/\bmba\b/) || q.match(/\bma\b/)) return 6;
  if (q.includes("bachelor") || q.includes("degree") || q.includes("bsc") || q.includes("bcom") || q.match(/\bba\b/)) return 5;
  if (q.includes("advanced diploma") || q.includes("higher diploma") || q.includes("adv. diploma")) return 4;
  if (q.includes("diploma")) return 3;
  if (q.includes("certificate") || q.includes("cert ")) return 2;
  if (q.includes("msce") || q.includes("high school") || q.includes("o-level") || q.includes("secondary")) return 1;

  return 0;
}

export function resolveHighestEducationQualification(
  qualification?: string | null,
  education?: Array<Record<string, any>> | null
): string | null {
  const educationQualifications = Array.isArray(education)
    ? education
        .map((entry: any) => {
          const value = entry?.certificate || entry?.degree || entry?.qualification || entry?.programme || entry?.program || entry?.name;
          return typeof value === "string" ? value.trim() : "";
        })
        .filter(Boolean)
    : [];

  if (educationQualifications.length === 0) {
    return null;
  }

  const detailedEducation = educationQualifications.find((value) =>
    /(bachelor|master|degree|diploma|certificate|phd|msc|bsc|ba\b|ma\b|diploma|associate|higher diploma|advanced diploma|education|teaching|business administration)/i.test(value)
  );

  return detailedEducation || educationQualifications[0] || null;
}

export function normalizeStringArray(raw?: string[] | string | null): string[] {
  if (!raw) return [];
  // Assuming skill-normalizer is client/server safe, if not, need to check its dependencies
  // If it's not safe, we'll need to re-implement a simple version here
  return Array.isArray(raw) ? raw : raw.split(/[,;\n]/);
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
