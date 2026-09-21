import { 
  SeekerProfile, 
  JobRequirements, 
  StructuredMatchResult,
  scoreJobSeekerMatch,
  resolveHighestEducationQualification,
  evaluateQualificationMatch,
  calculateYearsExperience
} from '@/lib/matching-helpers';

export interface UniversalMatchScore {
  score: number; // 0 - 100
  passed: boolean;
  qualificationPassed: boolean;
  qualificationScore: number;
  candidateEducationTitle: string | null;
  requiredQualificationTitle: string | null;
  experiencePassed: boolean;
  candidateYearsExperience: number;
  requiredYearsExperience: number;
  skillsPassed: boolean;
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];
  vectorSimScore?: number;
}

/**
  * Standardized builder to convert candidate and job inputs into a unified match telemetry object.
  */
export function computeUniversalMatchTelemetry(
  job: {
    title?: string | null;
    qualification?: string | null;
    minimum_years_experience?: number | null;
    must_have_skills?: string[] | string | null;
    required_certifications?: string[] | string | null;
  },
  candidate: {
    skills?: string[] | string | null;
    experience?: any[] | null;
    qualification?: string | null;
    education?: Array<Record<string, any>> | null;
    certifications?: string[] | string | null;
  },
  vectorSimScore?: number
): UniversalMatchScore {
  const candidateEducationTitle = resolveHighestEducationQualification(
    candidate.qualification,
    candidate.education
  );

  const seekerProfileForMatch = {
    ...candidate,
    qualification: candidateEducationTitle || null,
  };

  const structuredResult: StructuredMatchResult = scoreJobSeekerMatch(job, seekerProfileForMatch);

  return {
    score: structuredResult.score,
    passed: structuredResult.passed,
    qualificationPassed: structuredResult.breakdown.qualification.passed,
    qualificationScore: structuredResult.breakdown.qualification.score,
    candidateEducationTitle: candidateEducationTitle || "Not specified",
    requiredQualificationTitle: job.qualification || "Any Qualification",
    experiencePassed: structuredResult.breakdown.experience.passed,
    candidateYearsExperience: structuredResult.breakdown.experience.actual as number,
    requiredYearsExperience: (job.minimum_years_experience || 0),
    skillsPassed: structuredResult.breakdown.skills.passed,
    matchedSkills: structuredResult.breakdown.skills.matched || [],
    missingSkills: structuredResult.breakdown.skills.missing || [],
    reasons: structuredResult.reasons,
    vectorSimScore,
  };
}
