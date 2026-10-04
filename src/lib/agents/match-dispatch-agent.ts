/**
 * Match Dispatch Agent
 * ─────────────────────────────────────────────────────────────────────────────
 * Autonomous agent responsible for evaluating candidates and dispatching
 * matches when a job is posted or approved:
 *
 *   • Evaluates match qualifications, experience & domain fit
 *   • PREMIUM SEEKERS: Dispatched instantly via WHATSAPP (or queued as APPROVED
 *     depending on dispatch mode: AUTO vs MANUAL)
 *   • FREE SEEKERS: Dispatched via EMAIL (immediate or queued for 24h delayed batch)
 *   • Fully deduplicated via `notification_queue`
 *   • Emits Mission Control telemetry events for monitoring
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { computeMatchScore } from "@/lib/notification/orchestrator";
import { sendStandardJobMatchEmail } from "@/lib/notification/email-matching";
import { getMatchDispatchMode } from "@/lib/notification/settings";
import { processNotificationQueue } from "@/lib/notification/worker";
import { emitSystemEvent } from "@/lib/mission-control";
import { notifyAdmin, createNotification } from "@/lib/notifications";
import { passesJobHardRequirements, SeekerProfile } from "@/lib/matching-helpers";

export interface MatchDispatchOptions {
  jobId: string;
  forceImmediateEmail?: boolean;
}

export interface MatchDispatchSummary {
  jobId: string;
  jobTitle: string;
  totalEvaluated: number;
  premiumMatches: number;
  premiumDispatched: number;
  freeMatches: number;
  freeDispatched: number;
  errors: string[];
}

/**
 * Main entry point for the Match Dispatch Agent.
 * Designed to run smoothly without throwing uncaught exceptions to caller.
 */
export async function runMatchDispatchAgent(
  options: MatchDispatchOptions
): Promise<MatchDispatchSummary> {
  const { jobId, forceImmediateEmail = false } = options;
  const summary: MatchDispatchSummary = {
    jobId,
    jobTitle: "",
    totalEvaluated: 0,
    premiumMatches: 0,
    premiumDispatched: 0,
    freeMatches: 0,
    freeDispatched: 0,
    errors: [],
  };

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    summary.errors.push("Supabase admin client not initialized.");
    return summary;
  }

  try {
    // 1. Fetch Job details with domain and employer info
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*, employer:employers(company_name), qualification_domains(name)")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      summary.errors.push(`Could not fetch job ${jobId}: ${jobError?.message || "Not found"}`);
      return summary;
    }

    summary.jobTitle = job.title;

    if (job.status !== "ACTIVE") {
      console.log(`[MatchDispatchAgent] Job ${jobId} is not ACTIVE (status: ${job.status}). Skipping dispatch.`);
      return summary;
    }

    await emitSystemEvent({
      category: "MATCHING",
      severity: "INFO",
      event: "MATCH_DISPATCH_AGENT_STARTED",
      message: `[MatchDispatchAgent] Starting evaluation for "${job.title}" (${job.id})`,
      metadata: { jobId, title: job.title },
    });

    // 2. Fetch candidates via Vector RPC or fallback query
    let candidateIds: string[] = [];

    if (job.embedding) {
      const { data: vectorMatches, error: rpcError } = await supabase.rpc("match_candidates", {
        query_embedding: job.embedding,
        match_threshold: 0.15,
        match_count: 100,
      });

      if (!rpcError && Array.isArray(vectorMatches) && vectorMatches.length > 0) {
        candidateIds = vectorMatches.map((m: any) => m.id);
      }
    }

    // Fallback: If no vector matches, fetch active seekers within same domain or recent seekers
    if (candidateIds.length === 0) {
      let query = supabase
        .from("job_seekers")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(100);

      if (job.domain_id) {
        query = query.eq("domain_id", job.domain_id);
      }

      const { data: fallbackSeekers } = await query;
      candidateIds = (fallbackSeekers || []).map((s: any) => s.id);
    }

    if (candidateIds.length === 0) {
      console.log(`[MatchDispatchAgent] No candidates found to evaluate for job ${jobId}.`);
      return summary;
    }

    // 3. Fetch comprehensive candidate profiles
    const { data: candidates, error: seekersError } = await supabase
      .from("job_seekers")
      .select(`
        id,
        full_name,
        qualification,
        education,
        skills,
        experience,
        location,
        phone,
        domain_id,
        qualification_domains(name),
        notification_preferences(whatsapp_enabled, min_match_score),
        users!inner(email)
      `)
      .in("id", candidateIds);

    if (seekersError || !candidates || candidates.length === 0) {
      console.log(`[MatchDispatchAgent] No detailed profiles retrieved for candidates.`);
      return summary;
    }

    summary.totalEvaluated = candidates.length;

    // 4. Identify Active Premium Subscriptions
    const nowIso = new Date().toISOString();
    const { data: activeSubs } = await supabase
      .from("premium_subscriptions")
      .select("seeker_id")
      .in("seeker_id", candidateIds)
      .eq("status", "ACTIVE")
      .gt("ends_at", nowIso);

    const activePremiumSeekerIds = new Set((activeSubs || []).map((sub: any) => sub.seeker_id));

    // 5. Check Dispatch Mode (AUTO vs MANUAL)
    const dispatchMode = await getMatchDispatchMode();
    const initialWhatsAppStatus = dispatchMode === "AUTO" ? "PENDING" : "REQUIRES_APPROVAL";

    // 6. Evaluate Each Candidate and Route to Channels
    for (const seeker of candidates) {
      const isPremium = activePremiumSeekerIds.has(seeker.id);
      const seekerEmail = (seeker as any).users?.email;
      const userPrefs = Array.isArray(seeker.notification_preferences)
        ? seeker.notification_preferences[0]
        : seeker.notification_preferences;

      // Basic hard requirements knockout gate
      const seekerProfile: SeekerProfile = {
        skills: seeker.skills || [],
        experience: seeker.experience || [],
        qualification: seeker.qualification || null,
        education: seeker.education || [],
        certifications: [],
        _domain_name: (seeker.qualification_domains as any)?.name || null,
      };

      const hardPass = passesJobHardRequirements(job, seekerProfile);
      if (!hardPass.passed) {
        continue;
      }

      // Compute weighted match score with LLM skill analysis & domain validation
      const matchRes = await computeMatchScore(supabase, job, seeker);
      if (!matchRes.passedKnockout) {
        continue;
      }

      const threshold = userPrefs?.min_match_score || 50;
      if (matchRes.finalScore < threshold) {
        continue;
      }

      // Check for deduplication in notification_queue
      const { data: existingQueue } = await supabase
        .from("notification_queue")
        .select("id, status")
        .eq("seeker_id", seeker.id)
        .eq("job_id", job.id)
        .maybeSingle();

      if (existingQueue) {
        continue; // Already notified or in queue
      }

      const companyName = job.display_company_name || job.employer?.company_name || "Direct Employer";
      const seekerFirstName = seeker.full_name ? seeker.full_name.trim().split(" ")[0] : "Seeker";

      // ─────────────────────────────────────────────────────────────
      // ROUTE 1: PREMIUM SEEKERS -> WHATSAPP
      // ─────────────────────────────────────────────────────────────
      if (isPremium) {
        summary.premiumMatches++;

        if (seeker.phone && userPrefs?.whatsapp_enabled !== false) {
          const payload = {
            seekerName: seekerFirstName,
            jobTitle: job.title,
            company: companyName,
            location: job.location || "Malawi",
            matchScore: matchRes.finalScore,
            jobId: job.id,
            _dispatch: {
              channel: "WHATSAPP",
              tier: "PREMIUM",
              hasPhone: true,
              whatsappEnabled: true,
              mode: dispatchMode,
            },
            _scoring: {
              finalScore: matchRes.finalScore,
              qualScore: matchRes.ruleMatch.breakdown.qualification.score,
              expScore: matchRes.ruleMatch.breakdown.experience.score,
              llmSkillScore: matchRes.llmResult?.score || 0,
            }
          };

          const { error: insertErr } = await supabase
            .from("notification_queue")
            .insert({
              seeker_id: seeker.id,
              job_id: job.id,
              template_id: "aganyu_job_match_alert_v1",
              payload,
              status: initialWhatsAppStatus,
              attempts: 0,
            });

          if (!insertErr) {
            summary.premiumDispatched++;
            // Fire in-app notification bell for the seeker (non-blocking)
            createNotification({
              userId: seeker.id, // job_seekers.id = users.id
              type: "JOB_MATCH",
              templateVars: { companyName, jobTitle: job.title },
              link: `/dashboard/seeker/recommendations`,
            }).catch((e: any) =>
              console.warn(`[MatchDispatchAgent] In-app notify failed for seeker ${seeker.id}:`, e)
            );
          } else {
            summary.errors.push(`Queue error for seeker ${seeker.id}: ${insertErr.message}`);
          }
        }
      } 
      // ─────────────────────────────────────────────────────────────
      // ROUTE 2: FREE SEEKERS -> EMAIL
      // ─────────────────────────────────────────────────────────────
      else {
        summary.freeMatches++;

        if (seekerEmail) {
          // If forceImmediateEmail is true, dispatch via Resend now; otherwise queue with 24h delay
          if (forceImmediateEmail) {
            const emailRes = await sendStandardJobMatchEmail({
              seekerEmail,
              seekerName: seeker.full_name || "Job Seeker",
              jobTitle: job.title,
              companyName,
              location: job.location || "Malawi",
              jobId: job.id,
              matchScore: matchRes.finalScore,
            });

            if (emailRes.success) {
              summary.freeDispatched++;
              await supabase.from("notification_queue").insert({
                seeker_id: seeker.id,
                job_id: job.id,
                template_id: "standard_email_job_alert",
                payload: {
                  channel: "EMAIL",
                  tier: "FREE",
                  email: seekerEmail,
                  jobTitle: job.title,
                  matchScore: matchRes.finalScore,
                  company: companyName,
                  resolvedQual: matchRes.resolvedQual,
                },
                status: "SENT",
                attempts: 1,
              });
              // Fire in-app notification bell (non-blocking)
              createNotification({
                userId: seeker.id,
                type: "JOB_MATCH",
                templateVars: { companyName, jobTitle: job.title },
                link: `/dashboard/seeker/recommendations`,
              }).catch((e: any) =>
                console.warn(`[MatchDispatchAgent] In-app notify failed for seeker ${seeker.id}:`, e)
              );
            } else {
              summary.errors.push(`Email send failed for seeker ${seeker.id}: ${emailRes.error}`);
            }
          } else {
            // Queue for delayed 24h email release
            const scheduledFor = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            const { error: freeQueueErr } = await supabase.from("notification_queue").insert({
              seeker_id: seeker.id,
              job_id: job.id,
              template_id: "standard_email_job_alert",
              payload: {
                channel: "EMAIL",
                tier: "FREE_DELAYED",
                email: seekerEmail,
                jobTitle: job.title,
                matchScore: matchRes.finalScore,
                company: companyName,
                resolvedQual: matchRes.resolvedQual,
                _scoring: {
                  finalScore: matchRes.finalScore,
                  qualScore: matchRes.ruleMatch.breakdown.qualification.score,
                  expScore: matchRes.ruleMatch.breakdown.experience.score,
                  llmSkillScore: matchRes.llmResult?.score || 0,
                },
              },
              scheduled_for: scheduledFor,
              status: "PENDING",
              attempts: 0,
            });

            if (!freeQueueErr) {
              summary.freeDispatched++;
              // Fire in-app notification bell so seeker sees "Check your email for a job match" (non-blocking)
              createNotification({
                userId: seeker.id,
                type: "JOB_MATCH",
                templateVars: { companyName, jobTitle: job.title },
                link: `/dashboard/seeker/recommendations`,
              }).catch((e: any) =>
                console.warn(`[MatchDispatchAgent] In-app notify failed for seeker ${seeker.id}:`, e)
              );
            }
          }
        }
      }
    }

    // 7. If in AUTO mode, trigger the WhatsApp worker to dispatch pending items
    if (dispatchMode === "AUTO" && summary.premiumDispatched > 0) {
      processNotificationQueue().catch((err) =>
        console.error("[MatchDispatchAgent] Background queue processing error:", err)
      );
    }

    // 8. Log comprehensive system event
    await emitSystemEvent({
      category: "MATCHING",
      severity: "SUCCESS",
      event: "MATCH_DISPATCH_AGENT_COMPLETED",
      message: `[MatchDispatchAgent] Dispatched matches for "${job.title}": ${summary.premiumDispatched} Premium (WhatsApp), ${summary.freeDispatched} Free (Email)`,
      metadata: summary,
    });

  } catch (err: any) {
    console.error("[MatchDispatchAgent] Critical failure:", err);
    summary.errors.push(err.message || String(err));
    await emitSystemEvent({
      category: "MATCHING",
      severity: "CRITICAL",
      event: "MATCH_DISPATCH_AGENT_FAILED",
      message: `[MatchDispatchAgent] Execution failed for job ${jobId}: ${err?.message}`,
      metadata: { jobId, error: err?.message },
    });

    // Alert Admin directly in the Dashboard Notification Center & Push
    await notifyAdmin({
      title: "Match Dispatch Error",
      message: `AI match dispatch failed for job ${summary.jobTitle || jobId}: ${err?.message || "Unknown error"}`,
      type: "WARNING",
      link: "/dashboard/admin/notifications",
    }).catch((notifErr) => console.warn("[MatchDispatchAgent] Failed to send admin alert:", notifErr));
  }

  return summary;
}
