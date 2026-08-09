import { createSupabaseServerClient } from "@/lib/supabase-server";
import { fetchJobsWithEmployers } from "@/lib/seeker-data";
import { scoreJobSeekerMatch, SeekerProfile, StructuredMatchResult } from "@/lib/matching-helpers";
import { Job } from "@/types";
import { generateEmbedding } from "@/lib/embedding-service";

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
    return createSupabaseServerClient();
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
    const { limit = 10, threshold = 0.3 } = options;
    const matchCount = Math.max(limit * 2, 50);

    // 1. No quota gate for seekers — recommendations are always unlimited
    // (Seekers are the product; gating them hurts the talent pool)

    // 2. Get Seeker's embedding and profile fields needed for hard filtering
    const supabase = await this.getSupabase();
    const { data: seeker, error: seekerError } = await supabase
      .from('job_seekers')
      .select('embedding, skills, experience, qualification, certifications')
      .eq('id', userId)
      .single();

    if (seekerError || !seeker?.embedding) {
      throw new Error("Seeker profile embedding not found. Please complete your profile.");
    }

    // 3. Call pgvector matching function
    const { data: recommendations, error: recError } = await supabase.rpc('match_jobs_for_seeker', {
      query_embedding: seeker.embedding,
      match_threshold: threshold,
      match_count: matchCount,
    });

    if (recError) throw recError;

    const candidateJobs = Array.isArray(recommendations) ? recommendations : [];
    const jobIds = candidateJobs.map((item: any) => item.id);

    if (jobIds.length === 0) {
      return [];
    }

    const { data: jobs, error: jobsError } = await fetchJobsWithEmployers(supabase, jobIds, { status: "ACTIVE" });

    if (jobsError || !jobs) {
      throw jobsError || new Error('Failed to fetch candidate jobs');
    }

    const seekerProfile: SeekerProfile = {
      skills: seeker.skills || [],
      experience: seeker.experience || [],
      qualification: seeker.qualification || null,
      certifications: seeker.certifications || [],
    };

    const jobMap = new Map((jobs || []).map((job: any) => [job.id, job]));

    const filtered: RecommendedJob[] = candidateJobs
      .map((match: any) => {
        const job = jobMap.get(match.id);
        if (!job) return null;

        const structuredMatch = scoreJobSeekerMatch(job, seekerProfile);
        return {
          ...job,
          similarity: match.similarity || 0,
          hard_match_score: structuredMatch.score,
          hard_match_breakdown: structuredMatch.breakdown,
          hard_match_passed: structuredMatch.passed,
          hard_match_reasons: structuredMatch.reasons,
        } as RecommendedJob;
      })
      .filter((item): item is RecommendedJob => item !== null && item.hard_match_passed)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return filtered;
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
      .select('id, full_name, bio, location, skills, completion, experience, qualification, certifications, seniority_level, employment_status, profile_visibility, avatar_url')
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

        const seekerProfile: SeekerProfile = {
          skills: seeker.skills || [],
          experience: seeker.experience || [],
          qualification: seeker.qualification || null,
          certifications: seeker.certifications || [],
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
      throw new Error("Job embedding not found.");
    }

    const { data: similarJobs, error: simError } = await supabase.rpc('find_similar_jobs', {
      query_embedding: job.embedding,
      exclude_job_id: jobId,
      match_count: limit,
    });

    if (simError) throw simError;

    return similarJobs;
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
