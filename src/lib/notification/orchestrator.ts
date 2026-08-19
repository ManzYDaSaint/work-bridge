import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { processNotificationQueue } from "./worker";
import { scoreJobSeekerMatch, SeekerProfile } from "@/lib/matching-helpers";

/**
 * Orchestrates the matching and notification process using Hybrid Scoring
 * (Rule-based qualification/skills/experience breakdown + Vector Similarity)
 */
export async function runJobMatchingOrchestration() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error("[Orchestrator] Admin Supabase client not initialized.");
    return;
  }

  // 1. Fetch active jobs
  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("status", "ACTIVE");

  if (!jobs || jobs.length === 0) return;

  for (const job of jobs) {
    if (!job.embedding) continue;

    // 2. Initial Candidate Retrieval via Vector Similarity
    const { data: vectorMatches } = await supabase.rpc("match_candidates", {
      query_embedding: job.embedding,
      match_threshold: 0.2, // Cast a wider net for candidate retrieval
      match_count: 50
    });

    if (!vectorMatches || vectorMatches.length === 0) continue;

    const candidateIds = vectorMatches.map((m: any) => m.id);

    // 3. Fetch detailed Seeker Profiles for Rule-Based Verification
    const { data: seekers } = await supabase
      .from("job_seekers")
      .select("id, user_id, qualification, skills, experience, certifications")
      .in("id", candidateIds);

    if (!seekers || seekers.length === 0) continue;

    for (const match of vectorMatches) {
      const seeker = seekers.find((s: any) => s.id === match.id);
      if (!seeker) continue;

      // 4. Verify Active Premium Subscription
      const { data: sub } = await supabase
        .from("premium_subscriptions")
        .select("*")
        .eq("seeker_id", seeker.id)
        .eq("status", "ACTIVE")
        .single();

      if (!sub) continue;

      // 5. Rule-Based Requirement Evaluation
      const seekerProfile: SeekerProfile = {
        qualification: seeker.qualification || null,
        skills: seeker.skills || [],
        experience: seeker.experience || [],
        certifications: seeker.certifications || []
      };

      const ruleMatch = scoreJobSeekerMatch(job, seekerProfile);
      const ruleScore = ruleMatch.score; // 0 - 100 based on qualification, experience, skills, certs
      const vectorScore = Math.round((match.similarity || 0) * 100);

      // Malawian Market Hybrid Final Score: 70% Rule-Based Match + 30% Vector Similarity
      const finalScore = Math.round((ruleScore * 0.7) + (vectorScore * 0.3));

      // Qualification Knockout Floor: Skip WhatsApp alert if candidate has severe qualification deficit (score === 0)
      const qualScore = ruleMatch.breakdown.qualification.score;
      if (qualScore === 0 && job.qualification) {
        console.log(`[Orchestrator] Skipping candidate ${seeker.id} for job ${job.id}: Failed qualification floor.`);
        continue;
      }

      // Check Dispatch Mode (MANUAL approval vs AUTO pilot)
      const { getMatchDispatchMode } = await import("./settings");
      const dispatchMode = await getMatchDispatchMode();
      const initialStatus = dispatchMode === "AUTO" ? "PENDING" : "REQUIRES_APPROVAL";

      // Only queue alert if hybrid score meets minimum relevance threshold (50%)
      if (finalScore >= 50) {
        await supabase.from("notification_queue").insert({
          seeker_id: seeker.id,
          job_id: job.id,
          template_id: "new_job_match",
          payload: {
            jobTitle: job.title,
            company: job.display_company_name || "Direct Employer",
            matchScore: finalScore,
            ruleScore,
            vectorScore
          },
          status: initialStatus
        });
      }
    }
  }

  // If AUTO mode is active, immediately process pending WhatsApp notifications
  const { getMatchDispatchMode } = await import("./settings");
  const mode = await getMatchDispatchMode();
  if (mode === "AUTO") {
    await processNotificationQueue();
  } else {
    console.log("[Orchestrator] Manual Review Mode active. Matches queued for Admin Approval.");
  }
}
