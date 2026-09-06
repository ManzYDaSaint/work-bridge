import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { processNotificationQueue } from "./worker";
import { scoreJobSeekerMatch, SeekerProfile, normalizeStringArray } from "@/lib/matching-helpers";
import { evaluateSkillsWithGemini } from "@/lib/llm-skills-evaluator";
import { emitSystemEvent } from "@/lib/mission-control";

/**
 * Aganyu Premium Job Match Orchestrator
 *
 * Three-stage hybrid scoring pipeline:
 *
 *   Stage 1 — Rule-Based (fast, no API):
 *     • Qualification : 80% weight  ← primary gate
 *     • Experience    : 10% weight  ← rule-based (calculated years)
 *     Subtotal A = (qual * 0.8) + (exp * 0.1) → max 90 pts
 *
 *   Stage 2 — Gemini LLM Semantic Skills (10% weight):
 *     • Understands "Coding" = "Programming", "Web Dev" ≈ "JavaScript"
 *     • Falls back to rule-based exact match if Gemini is unavailable
 *     Subtotal B = llmSkillScore * 0.1 → max 10 pts
 *
 *   Stage 3 — Vector Embedding Boost (applied last):
 *     • Semantic similarity between job embedding and seeker embedding
 *     • Used as a ±10 pt modifier on top of rule+LLM score
 *     • Does NOT override qualification — just fine-tunes ranking
 *
 *   FINAL SCORE = min(100, SubtotalA + SubtotalB + vectorBoost)
 *   THRESHOLD   = 50 pts to queue a WhatsApp alert
 */
export async function runJobMatchingOrchestration() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error("[Orchestrator] Admin Supabase client not initialized.");
    return;
  }

  // ── Stage 0: Fetch active jobs ──────────────────────────────────
  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("status", "ACTIVE");

  if (!jobs || jobs.length === 0) return;

  // ── Fetch all active premium subscriptions ────────────────────────
  const nowIso = new Date().toISOString();
  const { data: activeSubs } = await supabase
    .from("premium_subscriptions")
    .select("seeker_id")
    .eq("status", "ACTIVE")
    .gt("ends_at", nowIso);

  if (!activeSubs || activeSubs.length === 0) {
    console.log("[Orchestrator] No active premium subscribers found.");
    return;
  }

  const premiumSeekerIds = activeSubs.map((s: any) => s.seeker_id);

  // ── Fetch detailed seeker profiles & preferences for active premium subscribers ─
  const { data: seekers } = await supabase
    .from("job_seekers")
    .select("id, user_id, full_name, qualification, skills, experience, location, phone, notification_preferences(whatsapp_enabled, min_match_score)")
    .in("id", premiumSeekerIds);

  if (!seekers || seekers.length === 0) return;

  for (const job of jobs) {
    // Stage 1a: Vector similarity score lookup (if embedding exists)
    let vectorMatchMap = new Map<string, number>();

    if (job.embedding) {
      const { data: vectorMatches } = await supabase.rpc("match_candidates", {
        query_embedding: job.embedding,
        match_threshold: 0.15,
        match_count: 200
      });

      if (vectorMatches && Array.isArray(vectorMatches)) {
        vectorMatches.forEach((m: any) => vectorMatchMap.set(m.id, m.similarity || 0));
      }
    }

    for (const seeker of seekers) {

      // ─────────────────────────────────────────────────────────────
      // STAGE 1 — Rule-Based: Qualification (80%) + Experience (10%)
      // ─────────────────────────────────────────────────────────────
      const seekerProfile: SeekerProfile = {
        qualification: seeker.qualification || null,
        skills: seeker.skills || [],
        experience: seeker.experience || [],
        certifications: []
      };

      const ruleMatch = scoreJobSeekerMatch(job, seekerProfile);

      // Education / experience gate for this product: hard filters come before ranking.
      const qualScore = ruleMatch.breakdown.qualification.score;
      if (job.qualification && qualScore === 0) {
        console.log(`[Orchestrator] Knockout: seeker ${seeker.id} failed qualification floor for job ${job.id}`);
        continue;
      }

      const requiredYears = job.minimum_years_experience || 0;
      const actualYears = ruleMatch.breakdown.experience.actual || 0;
      if (requiredYears > 0 && actualYears < requiredYears) {
        console.log(`[Orchestrator] Knockout: seeker ${seeker.id} has ${actualYears} years but job ${job.id} requires ${requiredYears}`);
        continue;
      }

      // Rule component = qual(80%) + experience(10%) — skills handled by LLM below
      const qualComponent  = (ruleMatch.breakdown.qualification.score * 0.80);
      const expComponent   = (ruleMatch.breakdown.experience.score    * 0.10);

      // ─────────────────────────────────────────────────────────────
      // STAGE 2 — Gemini LLM: Semantic Skills Evaluation (10%)
      // ─────────────────────────────────────────────────────────────
      const jobRequiredSkills = normalizeStringArray(job.must_have_skills);
      const seekerSkills      = normalizeStringArray(seeker.skills);
      const ruleFallbackSkillScore = ruleMatch.breakdown.skills.score;

      const llmResult = await evaluateSkillsWithGemini(
        job.title,
        jobRequiredSkills,
        seekerSkills,
        ruleFallbackSkillScore
      );

      const skillsComponent = llmResult.score * 0.10;

      // Rule + LLM combined base score (max 100)
      const baseScore = Math.round(qualComponent + expComponent + skillsComponent);

      // Experience Gap Penalty Cap: Prevent entry-level candidates from matching senior roles
      let adjustedBaseScore = baseScore;
      const minYearsReq = job.minimum_years_experience || 0;

      // This is a soft cap for very mismatched seniority, but the strict gate above already filters
      // on qualification and minimum years experience. Skills remain a ranking signal, not a blocker.
      if (minYearsReq >= 5 && actualYears < 2) {
        adjustedBaseScore = Math.min(adjustedBaseScore, 40);
      } else if (minYearsReq >= 3 && actualYears === 0) {
        adjustedBaseScore = Math.min(adjustedBaseScore, 45);
      }

      // ─────────────────────────────────────────────────────────────
      // STAGE 3 — Vector Embedding Boost (±10 pts modifier)
      // Applied last — fine-tunes ranking but cannot override qual gate
      // ─────────────────────────────────────────────────────────────
      const vectorSimilarity = vectorMatchMap.get(seeker.id) || 0; // 0.0–1.0
      const vectorBoost = vectorSimilarity > 0 ? Math.round((vectorSimilarity - 0.5) * 20) : 0; // -10 to +10 pts

      const finalScore = Math.max(0, Math.min(100, adjustedBaseScore + vectorBoost));

      console.log(
        `[Orchestrator] ${seeker.full_name} ↔ "${job.title}": ` +
        `qual=${ruleMatch.breakdown.qualification.score} exp=${ruleMatch.breakdown.experience.score} ` +
        `llmSkills=${llmResult.score}(${llmResult.fromLLM ? "LLM" : "rule"}) ` +
        `vector=${Math.round(vectorSimilarity * 100)}% boost=${vectorBoost} → FINAL=${finalScore}`
      );

      // ── Dispatch Mode: AUTO = queue immediately, MANUAL = needs admin approval ──
      const { getMatchDispatchMode } = await import("./settings");
      const dispatchMode = await getMatchDispatchMode();
      const initialStatus = dispatchMode === "AUTO" ? "PENDING" : "REQUIRES_APPROVAL";

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aganyu.com";
      const seekerFirstName = seeker.full_name ? seeker.full_name.trim().split(" ")[0] : "Seeker";

      // ── Honor candidate custom notification preferences ──
      const userPrefs = Array.isArray(seeker.notification_preferences)
        ? seeker.notification_preferences[0]
        : seeker.notification_preferences;

      const whatsappEnabled = userPrefs?.whatsapp_enabled !== false; // default true
      const requiredThreshold = userPrefs?.min_match_score || 50; // default 50%

      if (!whatsappEnabled) {
        console.log(`[Orchestrator] Seeker ${seeker.id} disabled WhatsApp alerts. Skipping.`);
        continue;
      }

      if (!seeker.phone) {
        console.log(`[Orchestrator] Seeker ${seeker.id} has no phone number on file. Skipping.`);
        continue;
      }

      // ── Queue WhatsApp alert if score meets candidate threshold & not already sent ──
      if (finalScore >= requiredThreshold) {
        // 1. Check if job alert already sent to seeker
        const { data: existingNotif } = await supabase
          .from("notification_queue")
          .select("id")
          .eq("seeker_id", seeker.id)
          .eq("job_id", job.id)
          .maybeSingle();

        if (existingNotif) {
          console.log(`[Orchestrator] Alert already queued/sent for seeker ${seeker.id} and job ${job.id}. Skipping.`);
          continue;
        }

        // 2. Cooldown Rate Limit: Max 3 WhatsApp job alerts per seeker per 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: recentCount } = await supabase
          .from("notification_queue")
          .select("id", { count: "exact", head: true })
          .eq("seeker_id", seeker.id)
          .gt("created_at", twentyFourHoursAgo);

        if (recentCount && recentCount >= 3) {
          console.log(`[Orchestrator] Seeker ${seeker.id} reached 24h WhatsApp alert limit (${recentCount}/3). Skipping.`);
          continue;
        }

        // Insert into queue with observability and error handling
        try {
          // Flag near-miss cases for admin inspection
          const nearMiss = finalScore < requiredThreshold && finalScore >= Math.max(35, requiredThreshold - 10);
          const scoring: {
            qualScore: number;
            qualPassed: boolean;
            expScore: number;
            expPassed: boolean;
            skillsRuleScore: number;
            skillsMatched: string[];
            skillsMissing: string[];
            llmSkillScore: number;
            llmFromGemini: boolean;
            llmReasoning: string;
            llmMatchedConcepts: string[];
            vectorSimilarity: number;
            vectorBoost: number;
            baseScore: number;
            finalScore: number;
            near_miss?: boolean;
          } = {
            qualScore: ruleMatch.breakdown.qualification.score,
            qualPassed: ruleMatch.breakdown.qualification.passed,
            expScore: ruleMatch.breakdown.experience.score,
            expPassed: ruleMatch.breakdown.experience.passed,
            skillsRuleScore: ruleMatch.breakdown.skills.score,
            skillsMatched: ruleMatch.breakdown.skills.matched || [],
            skillsMissing: ruleMatch.breakdown.skills.missing || [],
            llmSkillScore: llmResult.score,
            llmFromGemini: llmResult.fromLLM,
            llmReasoning: llmResult.reasoning,
            llmMatchedConcepts: llmResult.matchedConcepts || [],
            vectorSimilarity: Math.round(vectorSimilarity * 100),
            vectorBoost,
            baseScore,
            finalScore
          };

          if (nearMiss) scoring.near_miss = true;

          const payload = {
            seekerName: seekerFirstName,
            jobTitle: job.title,
            company: job.display_company_name || "Direct Employer",
            location: job.location || "Malawi",
            matchScore: finalScore,
            jobId: job.id, // dynamic button URL suffix
            // Debug metadata (not sent to WhatsApp, stored for admin review)
            _scoring: scoring
          };

          const { data: inserted, error: insertErr } = await supabase
            .from("notification_queue")
            .insert({
              seeker_id: seeker.id,
              job_id: job.id,
              template_id: "aganyu_job_match_alert_v1",
              payload,
              status: initialStatus,
              attempts: 0,
              next_attempt_at: null
            })
            .select();

          if (insertErr) {
            console.error(`[Orchestrator] Failed to insert notification for seeker ${seeker.id}, job ${job.id}:`, insertErr);
            await emitSystemEvent({
              category: "MATCHING",
              severity: "CRITICAL",
              event: "NOTIFICATION_QUEUE_INSERT_FAILED",
              message: `Failed to queue notification for seeker ${seeker.id} and job ${job.id}`,
              metadata: { seekerId: seeker.id, jobId: job.id, error: insertErr.message }
            });
          } else {
            console.log(`[Orchestrator] Queued notification for seeker ${seeker.id}, job ${job.id} (status=${initialStatus})`);
          }
        } catch (err: any) {
          console.error(`[Orchestrator] Exception inserting notification for seeker ${seeker.id}, job ${job.id}:`, err);
          await emitSystemEvent({
            category: "MATCHING",
            severity: "CRITICAL",
            event: "NOTIFICATION_QUEUE_INSERT_EXCEPTION",
            message: `Exception while queuing notification for seeker ${seeker.id} and job ${job.id}`,
            metadata: { seekerId: seeker.id, jobId: job.id, error: err?.message }
          });
        }
      }
    }
  }

  // ── Process queue immediately in AUTO mode ───────────────────────
  const { getMatchDispatchMode } = await import("./settings");
  const mode = await getMatchDispatchMode();
  if (mode === "AUTO") {
    await processNotificationQueue();
  } else {
    console.log("[Orchestrator] Manual Review Mode active. Matches queued for Admin Approval.");
  }
}
