import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { processNotificationQueue } from "./worker";
import { scoreJobSeekerMatch, SeekerProfile, normalizeStringArray, resolveHighestEducationQualification } from "@/lib/matching-helpers";
import { evaluateSkillsWithGemini } from "@/lib/llm-skills-evaluator";
import { emitSystemEvent } from "@/lib/mission-control";
import { sendStandardJobMatchEmail } from "./email-matching";

/**
 * Helper to compute match score between job and seeker.
 * Resolves full education certificate details (e.g. "Bachelors Degree In Social Science")
 * from seeker.education JSON array if present, rather than relying solely on highest tier string.
 */
async function computeMatchScore(supabase: any, job: any, seeker: any) {
  // Resolve exact specific certificate/degree title from the detailed education history array
  const resolvedQual = resolveHighestEducationQualification(seeker.qualification, seeker.education) || seeker.qualification;

  const seekerProfile: SeekerProfile = {
    qualification: resolvedQual || null,
    skills: seeker.skills || [],
    experience: seeker.experience || [],
    education: seeker.education || [],
    certifications: []
  };

  const ruleMatch = scoreJobSeekerMatch(job, seekerProfile);

  // Education knockout gate
  const qualScore = ruleMatch.breakdown.qualification.score;
  if (job.qualification && qualScore === 0) {
    return { passedKnockout: false, finalScore: 0, ruleMatch, llmResult: null, vectorSimilarity: 0, vectorBoost: 0, baseScore: 0, resolvedQual };
  }

  // Minimum years experience knockout gate
  const requiredYears = job.minimum_years_experience || 0;
  const actualYears = ruleMatch.breakdown.experience.actual || 0;
  if (requiredYears > 0 && actualYears < requiredYears) {
    return { passedKnockout: false, finalScore: 0, ruleMatch, llmResult: null, vectorSimilarity: 0, vectorBoost: 0, baseScore: 0, resolvedQual };
  }

  // Rule components
  const qualComponent = ruleMatch.breakdown.qualification.score * 0.80;
  const expComponent = ruleMatch.breakdown.experience.score * 0.10;

  // Gemini LLM Skills (10%)
  const jobRequiredSkills = normalizeStringArray(job.must_have_skills);
  const seekerSkills = normalizeStringArray(seeker.skills);
  const ruleFallbackSkillScore = ruleMatch.breakdown.skills.score;

  const llmResult = await evaluateSkillsWithGemini(
    job.title,
    jobRequiredSkills,
    seekerSkills,
    ruleFallbackSkillScore
  );

  const skillsComponent = llmResult.score * 0.10;
  const baseScore = Math.round(qualComponent + expComponent + skillsComponent);

  let adjustedBaseScore = baseScore;
  if (requiredYears >= 5 && actualYears < 2) {
    adjustedBaseScore = Math.min(adjustedBaseScore, 40);
  } else if (requiredYears >= 3 && actualYears === 0) {
    adjustedBaseScore = Math.min(adjustedBaseScore, 45);
  }

  // Vector boost
  let vectorSimilarity = 0;
  let vectorBoost = 0;
  if (job.embedding) {
    const { data: vectorMatches } = await supabase.rpc("match_candidates", {
      query_embedding: job.embedding,
      match_threshold: 0.15,
      match_count: 200
    });
    if (vectorMatches && Array.isArray(vectorMatches)) {
      const match = vectorMatches.find((m: any) => m.id === seeker.id);
      if (match) {
        vectorSimilarity = match.similarity || 0;
        vectorBoost = vectorSimilarity > 0 ? Math.round((vectorSimilarity - 0.5) * 20) : 0;
      }
    }
  }

  const finalScore = Math.max(0, Math.min(100, adjustedBaseScore + vectorBoost));
  return { passedKnockout: true, finalScore, ruleMatch, llmResult, vectorSimilarity, vectorBoost, baseScore, resolvedQual };
}

/**
 * Run Premium WhatsApp Matching on Job Post / Approval
 * Immediate trigger for active premium subscribers
 */
export async function runPremiumJobMatchingForJob(jobId: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (!job || job.status !== "ACTIVE") return;

  const nowIso = new Date().toISOString();
  const { data: activeSubs } = await supabase
    .from("premium_subscriptions")
    .select("seeker_id")
    .eq("status", "ACTIVE")
    .gt("ends_at", nowIso);

  if (!activeSubs || activeSubs.length === 0) return;
  const premiumSeekerIds = activeSubs.map((s: any) => s.seeker_id);

  const { data: seekers } = await supabase
    .from("job_seekers")
    .select("id, user_id, full_name, qualification, education, skills, experience, location, phone, notification_preferences(whatsapp_enabled, min_match_score)")
    .in("id", premiumSeekerIds);

  if (!seekers || seekers.length === 0) return;

  const { getMatchDispatchMode } = await import("./settings");
  const dispatchMode = await getMatchDispatchMode();
  const initialStatus = dispatchMode === "AUTO" ? "PENDING" : "REQUIRES_APPROVAL";

  for (const seeker of seekers) {
    if (!seeker.phone) continue;

    const userPrefs = Array.isArray(seeker.notification_preferences)
      ? seeker.notification_preferences[0]
      : seeker.notification_preferences;

    if (userPrefs?.whatsapp_enabled === false) continue;
    const requiredThreshold = userPrefs?.min_match_score || 50;

    const matchRes = await computeMatchScore(supabase, job, seeker);
    if (!matchRes.passedKnockout || matchRes.finalScore < requiredThreshold) continue;

    // Check if notification already queued
    const { data: existingNotif } = await supabase
      .from("notification_queue")
      .select("id")
      .eq("seeker_id", seeker.id)
      .eq("job_id", job.id)
      .maybeSingle();

    if (existingNotif) continue;

    const seekerFirstName = seeker.full_name ? seeker.full_name.trim().split(" ")[0] : "Seeker";

    const payload = {
      seekerName: seekerFirstName,
      jobTitle: job.title,
      company: job.display_company_name || "Direct Employer",
      location: job.location || "Malawi",
      matchScore: matchRes.finalScore,
      jobId: job.id,
      _scoring: {
        qualScore: matchRes.ruleMatch.breakdown.qualification.score,
        qualPassed: matchRes.ruleMatch.breakdown.qualification.passed,
        resolvedQual: matchRes.resolvedQual,
        expScore: matchRes.ruleMatch.breakdown.experience.score,
        expPassed: matchRes.ruleMatch.breakdown.experience.passed,
        llmSkillScore: matchRes.llmResult?.score || 0,
        finalScore: matchRes.finalScore
      }
    };

    await supabase
      .from("notification_queue")
      .insert({
        seeker_id: seeker.id,
        job_id: job.id,
        template_id: "aganyu_job_match_alert_v1",
        payload,
        status: initialStatus,
        attempts: 0
      });
  }
}

/**
 * Standard (Non-Premium) CRON Matching
 * Runs on schedule, sends Emails via Resend automatically
 */
export async function runStandardJobMatchingCron() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { processed: 0, sent: 0 };

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("status", "ACTIVE");

  if (!jobs || jobs.length === 0) return { processed: 0, sent: 0 };

  // Fetch non-premium active job seekers
  const nowIso = new Date().toISOString();
  const { data: activeSubs } = await supabase
    .from("premium_subscriptions")
    .select("seeker_id")
    .eq("status", "ACTIVE")
    .gt("ends_at", nowIso);

  const premiumSeekerIds = new Set((activeSubs || []).map((s: any) => s.seeker_id));

  // Get job seekers with user emails including education field
  const { data: seekers } = await supabase
    .from("job_seekers")
    .select("id, user_id, full_name, qualification, education, skills, experience, location, users!inner(email)");

  if (!seekers || seekers.length === 0) return { processed: 0, sent: 0 };

  const standardSeekers = seekers.filter((s: any) => !premiumSeekerIds.has(s.id));

  let processedCount = 0;
  let sentCount = 0;

  for (const job of jobs) {
    for (const seeker of standardSeekers) {
      const email = (seeker as any).users?.email;
      if (!email) continue;

      processedCount++;

      const matchRes = await computeMatchScore(supabase, job, seeker);
      if (!matchRes.passedKnockout || matchRes.finalScore < 50) continue;

      // Check log / avoid spamming email for same job match
      const { data: existingEmailLog } = await supabase
        .from("notification_queue")
        .select("id")
        .eq("seeker_id", seeker.id)
        .eq("job_id", job.id)
        .maybeSingle();

      if (existingEmailLog) continue;

      // Send email alert via Resend
      const res = await sendStandardJobMatchEmail({
        seekerEmail: email,
        seekerName: seeker.full_name || "Job Seeker",
        jobTitle: job.title,
        companyName: job.display_company_name || "Direct Employer",
        location: job.location || "Malawi",
        jobId: job.id,
        matchScore: matchRes.finalScore
      });

      if (res.success) {
        sentCount++;
        // Insert audit entry into notification_queue as SENT (Email)
        await supabase
          .from("notification_queue")
          .insert({
            seeker_id: seeker.id,
            job_id: job.id,
            template_id: "standard_email_job_alert",
            payload: {
              channel: "EMAIL",
              email,
              jobTitle: job.title,
              matchScore: matchRes.finalScore,
              resolvedQual: matchRes.resolvedQual
            },
            status: "SENT",
            attempts: 1,
            sent_at: new Date().toISOString()
          });
      }
    }
  }

  return { processed: processedCount, sent: sentCount };
}

/**
 * Main backward-compatible entry point used by cron / admin trigger
 */
export async function runJobMatchingOrchestration() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  const { data: activeJobs } = await supabase
    .from("jobs")
    .select("id")
    .eq("status", "ACTIVE");

  if (activeJobs) {
    for (const j of activeJobs) {
      await runPremiumJobMatchingForJob(j.id);
    }
  }

  // Run standard matching cron
  await runStandardJobMatchingCron();
}
