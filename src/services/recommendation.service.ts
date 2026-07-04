import { createSupabaseServerClient } from "@/lib/supabase-server";
import { generateEmbedding } from "@/lib/embedding-service";

export interface RecommendationOptions {
  limit?: number;
  threshold?: number;
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

    // 1. Quota Check (Free users limit: 5 per day/session - using 5 as placeholder)
    const isAllowed = await this.checkAndConsumeQuota(userId, 'recommendation', 5);
    if (!isAllowed) {
      throw new Error("Daily recommendation limit reached. Upgrade to Premium for unlimited access.");
    }

    // 2. Get Seeker's embedding
    const supabase = await this.getSupabase();
    const { data: seeker, error: seekerError } = await supabase
      .from('job_seekers')
      .select('embedding')
      .eq('id', userId)
      .single();

    if (seekerError || !seeker?.embedding) {
      throw new Error("Seeker profile embedding not found. Please complete your profile.");
    }

    // 3. Call pgvector matching function
    const { data: recommendations, error: recError } = await supabase.rpc('match_jobs_for_seeker', {
      query_embedding: seeker.embedding,
      match_threshold: threshold,
      match_count: limit,
    });

    if (recError) throw recError;

    return recommendations;
  }

  /**
   * Discover talents based on a job's requirements.
   */
  static async discoverTalent(jobId: string, employerId: string, options: RecommendationOptions = {}) {
    const { limit = 10, threshold = 0.3 } = options;

    // 1. Quota Check (Free users limit: 5 discoveries)
    const isAllowed = await this.checkAndConsumeQuota(employerId, 'discovery', 5);
    if (!isAllowed) {
      throw new Error("Talent discovery limit reached. Upgrade to Premium to find more candidates.");
    }

    // 2. Get Job's embedding
    const supabase = await this.getSupabase();
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('embedding')
      .eq('id', jobId)
      .single();

    if (jobError || !job?.embedding) {
      throw new Error("Job embedding not found.");
    }

    // 3. Call pgvector matching function
    const { data: candidates, error: candError } = await supabase.rpc('match_candidates_v2', {
      query_embedding: job.embedding,
      match_threshold: threshold,
      match_count: limit,
    });

    if (candError) throw candError;

    return candidates;
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
