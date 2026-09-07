import { createSupabaseServerClient } from "@/lib/supabase-server";
import { fetchJobsWithEmployers } from "@/lib/seeker-data";
import {
  scoreJobSeekerMatch,
  SeekerProfile,
  StructuredMatchResult,
  resolveHighestEducationQualification,
  getQualificationRank,
} from "@/lib/matching-helpers";
import { Job } from "@/types";
import { generateEmbedding } from "@/lib/embedding-service";
import { normalizeSkills } from "@/lib/skill-normalizer";

export interface RecommendationOptions {
  limit?: number;
  threshold?: number;
}

export interface RecommendedJob extends Job {
  similarity: number;
  hard_match_score: number;
  hard_match_breakdown: StructuredMatchResult["breakdown"];
  hard_match_reasons: string[];
  hard_match_passed: boolean;
}

export interface RecommendedCandidate extends Record<string, any> {
  similarity: number;
  hard_match_score: number;
  hard_match_breakdown: StructuredMatchResult["breakdown"];
  hard_match_reasons: string[];
  hard_match_passed: boolean;
}

export class RecommendationService {
  private static async getSupabase() {
    try {
      const { getSupabaseAdminClient } = await import("@/lib/supabase-admin");
      const admin = getSupabaseAdminClient();
      if (admin) return admin as any;
      return await createSupabaseServerClient();
    } catch {
      const { getSupabaseAdminClient } = await import("@/lib/supabase-admin");
      return getSupabaseAdminClient() as any;
    }
  }

  /**
   * Checks and consumes a quota for a specific action.
   * Returns true if the action is permitted, false otherwise.
   */
  private static async checkAndConsumeQuota(userId: string, quotaType: 'discovery' | 'recommendation' | 'invite' | 'gap_analysis', limit: number): Promise<boolean> {
    const supabase = await this.getSupabase();
    const { data: allowed, error } = await supabase.rpc('consume_quota', {
      p_user_id: userId,
      p_quota_type: quotaType,
      p_limit: limit,
    });

    if (error) {
      console.error(`[RecommendationService] Quota error for ${quotaType}:`, error);
      return false;
    }

    return !!allowed;
  }

  /**
   * Get personalized job recommendations for a seeker.
   */
  static async getRecommendedJobs(userId: string, options: RecommendationOptions = {}) {
    const { limit = 12 } = options;

    const supabase = await this.getSupabase();
    const { data: seeker, error: seekerError } = await supabase
      .from('job_seekers')
      .select('id, full_name, bio, location, skills, experience, education, qualification, embedding')
      .eq('id', userId)
      .single();

    if (seekerError || !seeker) {
      return [];
    }

    let seekerEmbedding = seeker.embedding;

    // Auto-generate missing seeker embedding on-the-fly if needed
    if (!seekerEmbedding) {
      try {
        const { constructSeekerDNA, generateEmbedding } = await import("@/lib/embedding-service");
        const dna = constructSeekerDNA(seeker);
        seekerEmbedding = await generateEmbedding(dna);

        if (seekerEmbedding) {
          const { getSupabaseAdminClient } = await import("@/lib/supabase-admin");
          const adminClient = getSupabaseAdminClient();
          if (adminClient) {
            await adminClient
              .from('job_seekers')
              .update({ embedding: seekerEmbedding })
              .eq('id', userId);
          }
        }
      } catch (err: any) {
        console.warn(`[RecommendationService] On-the-fly embedding generation skipped: ${err.message}`);
      }
    }

    const seekerProfile: SeekerProfile = {
      skills: seeker.skills || [],
      experience: seeker.experience || [],
      qualification: resolveHighestEducationQualification(seeker.qualification || null, seeker.education || []),
      education: seeker.education || [],
      certifications: [],
    };

    // Fetch active jobs for recommendation scoring
    const { data: activeJobs, error: activeErr } = await supabase
      .from('jobs')
      .select('id')
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(100);

    if (activeErr || !activeJobs || activeJobs.length === 0) {
      return [];
    }

    const jobIds = activeJobs.map((j: any) => j.id);
    const jobsRes = await fetchJobsWithEmployers(supabase, jobIds, { status: "ACTIVE" });
    const jobsList = jobsRes.data || [];

    if (jobsList.length === 0) {
      return [];
    }

    const scoredJobs: RecommendedJob[] = jobsList
      .map((job: any) => {
        const structuredMatch = scoreJobSeekerMatch(job, seekerProfile);
        // similarity = qualification score (0-1), the primary match signal.
        // hard_match_score = weighted composite (qual 80% + exp 10% + skills 10%).
        const qualScore = structuredMatch.breakdown.qualification.score / 100;
        return {
          ...job,
          similarity: qualScore,
          hard_match_score: structuredMatch.score,
          hard_match_breakdown: structuredMatch.breakdown,
          hard_match_passed: structuredMatch.passed,
          hard_match_reasons: structuredMatch.reasons,
        } as RecommendedJob;
      });

    const MIN_RELEVANCE_SCORE = 50;

    // First pass: jobs that actually pass all hard requirements
    const passedJobs = scoredJobs.filter(
      (j) => j.hard_match_passed && j.hard_match_score >= MIN_RELEVANCE_SCORE
    );

    // Second pass fallback: if not enough passed jobs, include high-scoring
    // failed jobs (e.g. missing experience but right qualification/field)
    const fallbackJobs =
      passedJobs.length < 3
        ? scoredJobs.filter(
            (j) => !j.hard_match_passed && j.hard_match_score >= MIN_RELEVANCE_SCORE
          )
        : [];

    const result = [...passedJobs, ...fallbackJobs]
      .sort((a, b) => b.hard_match_score - a.hard_match_score)
      .slice(0, limit);

    return result;
  }

  /**
   * Discover talents based on a job's requirements.
   */
  static async discoverTalent(jobId: string, employerId: string, options: RecommendationOptions = {}) {
    const { limit = 10, threshold = 0.3 } = options;

    // 1. Quota Check (Free users: 30 candidate profile views/month)
    const isAllowed = await this.checkAndConsumeQuota(employerId, 'discovery', 30);
    if (!isAllowed) {
      throw new Error("Talent discovery limit reached. Upgrade to Premium to find more candidates.");
    }

    // 2. Get Job's embedding and hard requirements
    const supabase = await this.getSupabase();
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, embedding, must_have_skills, minimum_years_experience, qualification, required_certifications, skills')
      .eq('id', jobId)
      .single();

    if (jobError || !job?.embedding) {
      throw new Error("Job embedding not found.");
    }

    // 3. Call pgvector matching function
    const candidateCount = Math.max(limit * 4, 100);
    const { data: candidates, error: candError } = await supabase.rpc('match_candidates', {
      query_embedding: job.embedding,
      match_threshold: threshold,
      match_count: candidateCount,
    });

    if (candError) throw candError;
    
    const validCandidates = Array.isArray(candidates) ? candidates : [];
    const candidateSeekerIds = validCandidates.map((item: any) => item.id);

    const { data: seekerRows, error: seekerRowsError } = await supabase
      .from('job_seekers')
      .select('id, full_name, bio, location, skills, completion, experience, education, qualification, seniority_level, employment_status, profile_visibility, avatar_url')
      .in('id', candidateSeekerIds);

    if (seekerRowsError) {
      throw seekerRowsError;
    }

    const filteredSeekers = (seekerRows || []).filter((seeker: any) => {
      if (seeker.profile_visibility === 'HIDDEN') return false;
      const hasSkills = Array.isArray(seeker.skills) && seeker.skills.length > 0;
      const hasBio = typeof seeker.bio === 'string' && seeker.bio.trim().length > 10;
      const isCompleteEnough = (seeker.completion ?? 0) >= 25;
      return isCompleteEnough || hasSkills || hasBio;
    });

    const seekerMap = new Map(filteredSeekers.map((row: any) => [row.id, row]));

    const seekerMatches: RecommendedCandidate[] = validCandidates
      .map((match: any) => {
        const seeker = seekerMap.get(match.id);
        if (!seeker) return null;

        const s = seeker as any;
        const seekerProfile: SeekerProfile = {
          skills: s.skills || [],
          experience: s.experience || [],
          qualification: resolveHighestEducationQualification(s.qualification || null, s.education || []),
          education: s.education || [],
          certifications: [],
        };

        const structuredMatch = scoreJobSeekerMatch(job, seekerProfile);
        if (!structuredMatch.passed) return null;

        return {
          ...seeker,
          ...match,
          similarity: match.similarity || 0,
          hard_match_score: structuredMatch.score,
          hard_match_breakdown: structuredMatch.breakdown,
          hard_match_reasons: structuredMatch.reasons,
          hard_match_passed: structuredMatch.passed,
        } as RecommendedCandidate;
      })
      .filter((item): item is RecommendedCandidate => item !== null)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    let validCandidatesWithRoles = seekerMatches;

    if (validCandidatesWithRoles.length > 0) {
        const { getSupabaseAdminClient } = await import("@/lib/supabase-admin");
        const adminClient = getSupabaseAdminClient();
        if (adminClient) {
            const seekerIds = validCandidatesWithRoles.map((c: any) => c.id);
            const { data: userRoles } = await adminClient
                .from("users")
                .select("id, role")
                .in("id", seekerIds);
            
            if (userRoles) {
                const validIds = new Set(userRoles.filter(u => u.role === "JOB_SEEKER").map(u => u.id));
                validCandidatesWithRoles = validCandidatesWithRoles.filter((c: any) => validIds.has(c.id));
            }
        }
    }

    return validCandidatesWithRoles;
  }

  /**
   * Fallback: find jobs with similar qualification and skill requirements when embedding-based
   * similarity is not available or returns no matches.
   */
  private static async getQualificationBasedSimilarJobs(jobId: string, limit: number) {
    const supabase = await this.getSupabase();

    const { data: anchorJob, error: anchorError } = await supabase
      .from('jobs')
      .select('id, title, type, work_mode, qualification, minimum_years_experience, skills, must_have_skills, nice_to_have_skills, location, status, public_slug, display_company_name, employer_id, created_at')
      .eq('id', jobId)
      .maybeSingle();

    if (anchorError || !anchorJob) {
      return [];
    }

    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, title, type, work_mode, qualification, minimum_years_experience, skills, must_have_skills, nice_to_have_skills, location, status, public_slug, display_company_name, employer_id, created_at')
      .eq('status', 'ACTIVE')
      .neq('id', jobId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (jobsError || !jobs || jobs.length === 0) {
      return [];
    }

    const currentSkills = new Set(
      normalizeSkills([
        ...(anchorJob.must_have_skills || []),
        ...(anchorJob.skills || []),
        ...(anchorJob.nice_to_have_skills || []),
      ])
    );
    const currentQualification = anchorJob.qualification || null;
    const currentQualificationRank = getQualificationRank(currentQualification);
    const currentMinExp = Number(anchorJob.minimum_years_experience ?? 0) || 0;

    const scoredJobs = jobs
      .map((candidate: any) => {
        const candidateSkills = normalizeSkills([
          ...(candidate.must_have_skills || []),
          ...(candidate.skills || []),
          ...(candidate.nice_to_have_skills || []),
        ]);
        const candidateSkillSet = new Set(candidateSkills);

        const overlap = [...currentSkills].filter((skill) => candidateSkillSet.has(skill));
        const skillOverlapRatio = currentSkills.size > 0
          ? overlap.length / Math.max(currentSkills.size, 1)
          : 0;

        const candidateQualificationRank = getQualificationRank(candidate.qualification || null);
        let qualificationScore = 0;

        if (currentQualification && candidate.qualification) {
          const currentLower = currentQualification.toLowerCase();
          const candidateLower = candidate.qualification.toLowerCase();

          if (currentLower === candidateLower || candidateLower.includes(currentLower) || currentLower.includes(candidateLower)) {
            qualificationScore = 1;
          } else if (currentQualificationRank > 0 && candidateQualificationRank > 0) {
            const delta = Math.abs(currentQualificationRank - candidateQualificationRank);
            if (delta === 0) qualificationScore = 1;
            else if (delta === 1) qualificationScore = 0.75;
            else if (delta === 2) qualificationScore = 0.4;
            else qualificationScore = 0.15;
          } else {
            qualificationScore = 0.5;
          }
        } else if (!currentQualification && candidate.qualification) {
          qualificationScore = 0.4;
        } else if (currentQualification && !candidate.qualification) {
          qualificationScore = 0.2;
        } else {
          qualificationScore = 0.5;
        }

        const candidateMinExp = Number(candidate.minimum_years_experience ?? 0) || 0;
        const expDelta = Math.abs(currentMinExp - candidateMinExp);
        let experienceScore = 0.5;
        if (currentMinExp > 0) {
          if (expDelta <= 1) experienceScore = 1;
          else if (expDelta <= 3) experienceScore = 0.75;
          else if (expDelta <= 5) experienceScore = 0.45;
          else experienceScore = 0.2;
        }

        const typeBonus = anchorJob.type && candidate.type && anchorJob.type === candidate.type ? 0.15 : 0;
        const workModeBonus = anchorJob.work_mode && candidate.work_mode && anchorJob.work_mode === candidate.work_mode ? 0.1 : 0;
        const locationBonus = anchorJob.location && candidate.location && anchorJob.location.toLowerCase() === candidate.location.toLowerCase() ? 0.1 : 0;

        const score = (
          qualificationScore * 50 +
          skillOverlapRatio * 30 +
          experienceScore * 15 +
          typeBonus * 100 +
          workModeBonus * 100 +
          locationBonus * 100
        );

        return {
          ...candidate,
          _similarity_score: score,
          _overlap_count: overlap.length,
        };
      })
      .filter((candidate: any) => {
        const hasRelevantSignal = candidate._similarity_score >= 25 || candidate._overlap_count > 0;
        return hasRelevantSignal;
      })
      .sort((a: any, b: any) => b._similarity_score - a._similarity_score)
      .slice(0, limit)
      .map(({ _similarity_score, _overlap_count, ...candidate }: any) => candidate);

    return scoredJobs;
  }

  /**
   * Find jobs similar to a given job.
   */
  static async getSimilarJobs(jobId: string, options: RecommendationOptions = {}) {
    const { limit = 5 } = options;

    const supabase = await this.getSupabase();
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('embedding')
      .eq('id', jobId)
      .single();

    if (jobError || !job?.embedding) {
      return this.getQualificationBasedSimilarJobs(jobId, limit);
    }

    try {
      const { data: similarJobs, error: simError } = await supabase.rpc('find_similar_jobs', {
        query_embedding: job.embedding,
        exclude_job_id: jobId,
        match_count: limit,
      });

      if (simError) {
        return this.getQualificationBasedSimilarJobs(jobId, limit);
      }

      if (!Array.isArray(similarJobs) || similarJobs.length === 0) {
        return this.getQualificationBasedSimilarJobs(jobId, limit);
      }

      return similarJobs;
    } catch {
      return this.getQualificationBasedSimilarJobs(jobId, limit);
    }
  }

  /**
   * Rank applicants for a job based on AI match score.
   */
  static async rankApplicants(jobId: string) {
    const supabase = await this.getSupabase();
    const { data: ranked, error } = await supabase.rpc('rank_applicants', {
      p_job_id: jobId,
    });

    if (error) throw error;

    return ranked;
  }

  /**
   * Semantic search for jobs using a free-text query.
   */
  static async semanticSearchJobs(query: string, limit = 20) {
    const embedding = await generateEmbedding(query);

    const supabase = await this.getSupabase();
    const { data: results, error } = await supabase.rpc('semantic_search_jobs', {
      query_embedding: embedding,
      match_count: limit,
    });

    if (error) throw error;

    return results;
  }

  /**
   * Semantic search for seekers using a free-text query.
   */
  static async semanticSearchSeekers(query: string, limit = 20) {
    const embedding = await generateEmbedding(query);

    const supabase = await this.getSupabase();
    const { data: results, error } = await supabase.rpc('semantic_search_seekers', {
      query_embedding: embedding,
      match_count: limit,
    });

    if (error) throw error;

    return results;
  }
}
