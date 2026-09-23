import 'server-only';
import { 
  calculateYearsExperience, 
  requiredSkillsMatch, 
  requiredCertificationsMatch,
  getQualificationRank
} from "./matching-helpers-shared";

// Re-export shared functions and types
export * from "./matching-helpers-shared";

// Pre-populated cache for synchronous access
let dynamicMappings: { raw: string; domain: string }[] = [];

// Call this on app startup or periodically to refresh the cache
export async function refreshDynamicMappings() {
  const { getCachedQualificationMappings } = await import("./mapping-cache");
  const mappings = await getCachedQualificationMappings();
  dynamicMappings = mappings as { raw: string; domain: string }[];
}

const DISCIPLINE_DOMAINS: Record<string, string[]> = {
  computing: [
    "computing", "computer science", "information technology",
    "software engineering", "software development", "computer engineering",
    "information systems", "ict", "data science", "cybersecurity",
    "artificial intelligence", "programming", "computer studies",
    "network engineering", "telecommunications", "communication technology",
    "systems support", "information science",
  ],
  nursing_health: [
    "nursing", "midwif", "clinical medicine", "clinical science",
    "medical laboratory", "pharmacy", "pharmaceutical", "laboratory sciences",
    "biomedical", "public health", "occupational health", "health science",
    "clinical medicine", "physiotherapy", "radiography", "environmental health",
    "medical imaging", "optometry", "dentistry", "medicine",
  ],
  education: [
    "education", "teaching", "pedagogy", "curriculum",
    "early childhood", "primary education", "secondary education",
    "civic education",
  ],
  finance_accounting: [
    "accountancy", "accounting", "finance", "economics", "commerce",
    "financial management", "banking", "actuarial", "audit", "taxation",
    "bcom", "acca", "cima", "cia",
  ],
  engineering: [
    "engineering", "civil engineering", "mechanical engineering",
    "electrical engineering", "electronics engineering", "structural engineering",
    "chemical engineering", "materials science", "telecommunication engineering",
  ],
  agriculture: [
    "agriculture", "agronomy", "soil science", "agribusiness",
    "horticulture", "veterinary", "fisheries", "food science",
    "natural resources", "forestry", "climate smart agriculture",
    "environmental science", "environmental management", "biomass",
  ],
  law: ["law", "legal studies", "jurisprudence", "llb"],
  social_science: [
    "social science", "sociology", "psychology", "social work",
    "social work", "anthropology", "political science", "development studies",
    "community development", "transformative community", "gender studies",
    "public policy", "human rights", "governance",
    "rural development", "international relations",
  ],
  humanities: [
    "humanities", "arts", "philosophy", "history", "languages", "literature",
  ],
  media_journalism: [
    "mass communication", "journalism", "media", "public relations",
    "communication studies", "corporate communication", "broadcasting",
    "media and development", "media and culture",
  ],
  library_information: [
    "library science", "information management", "records management",
    "archives", "documentation", "library studies",
  ],
  procurement_logistics: [
    "procurement", "supply chain management", "logistics management",
    "purchasing", "supply chain", "logistics",
  ],
  human_resources: [
    "human resource", "human resources", "hr management", "personnel management",
    "industrial relations",
  ],
  business_admin: [
    "business administration", "business management", "management studies",
    "office administration", "public administration", "bba", "mba",
  ],
  trades_construction: [
    "foreman", "construction", "building", "masonry", "carpentry",
    "plumbing", "electrical installation", "welding", "artisan",
    "site supervisor", "site foreman", "mechanic", "civil works",
    "pipefitting", "scaffolding", "bricklaying",
  ],
  hospitality: [
    "hospitality", "food and beverages", "front office", "catering",
    "hotel management", "tourism", "restaurant management",
  ],
};

export function getQualificationDomains(qualString?: string | null): string[] {
  if (!qualString) return [];
  const q = qualString.toLowerCase();

  // 1. Dynamic Check
  const foundDomains: string[] = [];
  const dynamicMatch = dynamicMappings.find(m => m.raw === q);
  if (dynamicMatch) {
    foundDomains.push(dynamicMatch.domain);
  }

  // 2. Static Check (fallback/supplement)
  for (const [domain, keywords] of Object.entries(DISCIPLINE_DOMAINS)) {
    if (
      keywords.some((kw) => {
        if (kw.length <= 4) {
          const regex = new RegExp(`\\b${kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i");
          return regex.test(q);
        }
        return q.includes(kw);
      })
    ) {
      if (!foundDomains.includes(domain)) foundDomains.push(domain);
    }
  }

  return foundDomains;
}

export function evaluateQualificationMatch(
  jobQualification?: string | null,
  seekerQualification?: string | null,
  jobTitle?: string | null,
  seekerSkills?: string[] | string | null
): { passed: boolean; score: number; mismatchedDomain?: boolean } {
  // Extract domains from qualification text AND job title / seeker skills
  const jobDomains = Array.from(new Set([
    ...getQualificationDomains(jobQualification),
    ...getQualificationDomains(jobTitle)
  ]));

  const seekerSkillStr = Array.isArray(seekerSkills) ? seekerSkills.join(" ") : (seekerSkills || "");
  const seekerDomains = Array.from(new Set([
    ...getQualificationDomains(seekerQualification),
    ...getQualificationDomains(seekerSkillStr)
  ]));

  // Domain mismatch check: if job belongs to specific discipline(s) and candidate belongs to other discipline(s)
  if (jobDomains.length > 0 && seekerDomains.length > 0) {
    const hasDomainOverlap = seekerDomains.some((sd) => jobDomains.includes(sd));
    if (!hasDomainOverlap) {
      // Cross-discipline domain mismatch (e.g. Software Engineer applying for Foreman)
      return { passed: false, score: 0, mismatchedDomain: true };
    }
  }

  if (!jobQualification || !jobQualification.trim()) {
    return { passed: true, score: 100 };
  }
  if (!seekerQualification || !seekerQualification.trim()) {
    return { passed: false, score: 0 };
  }

  const jobQualLower = jobQualification.toLowerCase().trim();
  const seekerQualLower = seekerQualification.toLowerCase().trim();

  // 1. Exact string match check
  if (seekerQualLower === jobQualLower) {
    return { passed: true, score: 100 };
  }

  // 2. Malawian Hierarchy Rank Evaluation
  const jobRank = getQualificationRank(jobQualification);
  const seekerRank = getQualificationRank(seekerQualification);

  if (jobRank > 0 && seekerRank > 0) {
    if (seekerRank >= jobRank) {
      return { passed: true, score: 100 };
    }
    if (seekerRank === jobRank - 1) {
      return { passed: false, score: 40 };
    }
    return { passed: false, score: 0 };
  }

  return { passed: false, score: 0 };
}

export function qualificationMatches(
  jobQualification?: string | null,
  seekerQualification?: string | null,
  jobTitle?: string | null,
  seekerSkills?: string[] | string | null
): boolean {
  return evaluateQualificationMatch(jobQualification, seekerQualification, jobTitle, seekerSkills).passed;
}

/**
 * Rule-based scoring only (no LLM).
 * Weights: Qualification=80%, Experience=10%, Skills=10%
 * Skills here are exact/normalized matches — for semantic LLM scoring use scoreJobSeekerMatchWithLLM.
 */
export function scoreJobSeekerMatch(
  job: any,
  seeker: any,
  weights: any = { qualification: 80, experience: 10, skills: 10, certifications: 0 }
): any {
  const qualEval = evaluateQualificationMatch(job.qualification, seeker.qualification, (job as any).title, seeker.skills);
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
  const baseScore = Math.round(
    (qualificationScore * weights.qualification +
      experienceScore * weights.experience +
      skillsScore * weights.skills +
      certificationsScore * weights.certifications) / totalWeight
  );
  
  // Qualification Gate Knockout: if candidate failed qualification gate, composite match score MUST be 0
  const score = !qualificationPassed
    ? 0
    : Math.max(0, Math.min(100, baseScore));

  // Qualification is the primary gate. Experience/Skills are now scoring factors only.
  const passed = qualificationPassed;

  const reasons: string[] = [];
  if (!qualificationPassed) {
    if ((qualEval as any).mismatchedDomain) {
      reasons.push(`Field of study mismatch: your degree is not in the required discipline for this role`);
    } else {
      reasons.push(`Qualification level not met — requires: ${job.qualification}`);
    }
  }

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
        matched: skillMatch.required.filter((skill: string) => skillMatch.seeker.includes(skill)),
        missing: skillMatch.missing,
      },
      certifications: {
        passed: certMatch.passed,
        score: certificationsScore,
        required: certMatch.required,
        actual: certMatch.seeker,
        matched: certMatch.required.filter((cert: string) => certMatch.seeker.includes(cert)),
        missing: certMatch.missing,
      },
    },
  };
}

export function passesJobHardRequirements(
  job: any,
  seeker: any
): any {
  const { passed, reasons, breakdown } = scoreJobSeekerMatch(job, seeker);
  return {
    passed,
    reasons,
    yearsExperience: breakdown.experience.actual as number,
    missingSkills: breakdown.skills.missing || [],
    missingCertifications: breakdown.certifications.missing || [],
  };
}
