import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { processNotificationQueue } from "./worker";
import { scoreJobSeekerMatch, SeekerProfile, normalizeStringArray } from "@/lib/matching-helpers";
import { evaluateSkillsWithGemini } from "@/lib/llm-skills-evaluator";

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

  for (const job of jobs) {
    if (!job.embedding) continue;

    // ── Stage 1a: Candidate retrieval via Vector Similarity ─────────
    const { data: vectorMatches } = await supabase.rpc("match_candidates", {
      query_embedding: job.embedding,
      match_threshold: 0.2,   // wide net — LLM + rules will filter precisely
      match_count: 50
    });

    if (!vectorMatches || vectorMatches.length === 0) continue;

    const candidateIds = vectorMatches.map((m: any) => m.id);

    // ── Fetch detailed seeker profiles ──────────────────────────────
    const { data: seekers } = await supabase
      .from("job_seekers")
      .select("id, user_id, full_name, qualification, skills, experience")
      .in("id", candidateIds);

    if (!seekers || seekers.length === 0) continue;

    for (const match of vectorMatches) {
      const seeker = seekers.find((s: any) => s.id === match.id);
      if (!seeker) continue;

      // ── Premium gate: only notify premium subscribers ────────────
      const { data: sub } = await supabase
        .from("premium_subscriptions")
        .select("id")
        .eq("seeker_id", seeker.id)
        .eq("status", "ACTIVE")
        .single();

      if (!sub) continue;

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

      // Qualification Knockout Floor: if seeker is 2+ levels below requirement, skip entirely
      const qualScore = ruleMatch.breakdown.qualification.score;
      if (qualScore === 0 && job.qualification) {
        console.log(`[Orchestrator] Knockout: seeker ${seeker.id} failed qualification floor for job ${job.id}`);
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
      const actualYears = ruleMatch.breakdown.experience.actual || 0;
      
      if (minYearsReq >= 5 && actualYears < 2) {
        // Senior/Management role requiring 5+ years, candidate has < 2 years -> Cap at 40 (No Alert)
        adjustedBaseScore = Math.min(adjustedBaseScore, 40);
      } else if (minYearsReq >= 3 && actualYears === 0) {
        // Mid-level role requiring 3+ years, candidate has 0 years -> Cap at 45 (No Alert)
        adjustedBaseScore = Math.min(adjustedBaseScore, 45);
      }

      // ─────────────────────────────────────────────────────────────
      // STAGE 3 — Vector Embedding Boost (±10 pts modifier)
      // Applied last — fine-tunes ranking but cannot override qual gate
      // ─────────────────────────────────────────────────────────────
      const vectorSimilarity = match.similarity || 0; // 0.0–1.0
      const vectorBoost = Math.round((vectorSimilarity - 0.5) * 20); // -10 to +10 pts

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

      // ── Queue WhatsApp alert if score meets threshold & not already sent ──
      if (finalScore >= 50) {
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

        await supabase.from("notification_queue").insert({
          seeker_id: seeker.id,
          job_id: job.id,
          template_id: "aganyu_job_match_alert_v1",
          payload: {
            seekerName: seekerFirstName,
            jobTitle: job.title,
            company: job.display_company_name || "Direct Employer",
            location: job.location || "Malawi",
            matchScore: finalScore,
            jobId: job.id,   // dynamic button URL suffix
            // Debug metadata (not sent to WhatsApp, stored for admin review)
            _scoring: {
              qualScore: ruleMatch.breakdown.qualification.score,
              expScore: ruleMatch.breakdown.experience.score,
              llmSkillScore: llmResult.score,
              llmFromGemini: llmResult.fromLLM,
              llmReasoning: llmResult.reasoning,
              vectorSimilarity: Math.round(vectorSimilarity * 100),
              vectorBoost,
              baseScore,
              finalScore
            }
          },
          status: initialStatus
        });
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
