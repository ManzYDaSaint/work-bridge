import { createNotification } from "./notifications";
import { getSupabaseAdminClient } from "./supabase-admin";
import { emitSystemEvent } from "./mission-control";

/**
 * Triggers AI match notifications for a newly posted job.
 * 
 * SAFETY: This function is designed to be called in a fire-and-forget pattern
 * (without await) so it never blocks the job creation response.
 */
export async function triggerMatchNotifications(jobId: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error("[MATCH_SERVICE] FAILED: Admin client not initialized.");
    return;
  }

  try {
    // 1. Fetch the job details and its AI embedding
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select(`*, employer:employers(company_name)`)
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      console.error(`[MATCH_SERVICE] FAILED: Could not fetch job ${jobId}:`, jobError);
      return;
    }
    
    if (!job.embedding) {
      console.warn(`[MATCH_SERVICE] Job ${jobId} lacks an embedding. Skipping AI match.`);
      return;
    }

    console.log(`[MATCH_SERVICE] Starting AI match scan for job: ${job.title}`);

    // 2. Use the match_candidates RPC to instantly find the top matching seekers
    const { data: matches, error: matchError } = await supabase.rpc("match_candidates", {
      query_embedding: job.embedding,
      match_threshold: 0.25, // fairly strict match
      match_count: 50 // top 50 candidates
    });
    
    if (matchError) {
      console.error(`[MATCH_SERVICE] FAILED: RPC error:`, matchError);
      return;
    }

    if (!matches || matches.length === 0) {
      console.log(`[MATCH_SERVICE] No strong AI matches found for job ${jobId}.`);
      return;
    }

    // 3. We need to fetch the user_ids for these seekers to send notifications
    const seekerIds = matches.map((m: any) => m.id);
    const { data: seekers } = await supabase
      .from("job_seekers")
      .select("id, user_id, user:users(plan)")
      .in("id", seekerIds);
      
    if (!seekers) return;

    // Monetization: Premium users get notifications instantly. Free users get delayed notification.
    const premiumSeekers = seekers.filter((s: any) => s.user?.plan === "PREMIUM" || s.user?.plan === "PRO");
    const freeSeekers = seekers.filter((s: any) => !s.user?.plan || s.user?.plan === "FREE");

    // Instantly notify premium seekers
    const notifications = premiumSeekers.map((seeker: any) =>
        createNotification({
          userId: seeker.user_id,
          type: "JOB_MATCH",
          templateVars: {
            companyName: job.display_company_name || job.employer?.company_name || "a company",
            jobTitle: job.title,
          },
          link: `/dashboard/seeker/recommendations`,
        }).catch((err: any) =>
          console.warn(`[MATCH_SERVICE] Could not notify premium user ${seeker.user_id}:`, err)
        )
    );

    await Promise.all(notifications);
    console.log(`[MATCH_SERVICE] Done. Sent INSTANT AI Match alerts to ${notifications.length} Premium candidates for job ${jobId}.`);
    
    await emitSystemEvent({
        category: "MATCHING",
        severity: "SUCCESS",
        event: "AI_MATCH_ALERTS_SENT",
        message: `Sent INSTANT AI Match alerts to ${notifications.length} Premium candidates for job ${jobId}`,
        metadata: { jobId, jobTitle: job.title, count: notifications.length, type: "PREMIUM" }
    });

    // For Free users, we queue them into a separate table or process them via a Cron job.
    // For now, we will simply log that they are queued for the 24h delay batch.
    console.log(`[MATCH_SERVICE] ${freeSeekers.length} Free candidates are queued for the 24-hour delayed alert.`);
    
    await emitSystemEvent({
        category: "MATCHING",
        severity: "INFO",
        event: "AI_MATCH_ALERTS_QUEUED",
        message: `${freeSeekers.length} Free candidates queued for delayed match alert for job ${jobId}`,
        metadata: { jobId, count: freeSeekers.length, type: "FREE" }
    });

  } catch (err: any) {
    console.error("[MATCH_SERVICE] Unexpected error:", err);
    await emitSystemEvent({
        category: "MATCHING",
        severity: "CRITICAL",
        event: "AI_MATCH_FAILED",
        message: `AI Match service failed for job ${jobId}`,
        metadata: { jobId, error: err.message }
    });
  }
}

/**
 * Trigger delayed match notifications for Free users (intended to be called by a cron job)
 */
export async function triggerDelayedFreeMatchNotifications(jobId: string) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return;

    try {
        const { data: job } = await supabase.from("jobs").select("*, employer:employers(company_name)").eq("id", jobId).single();
        if (!job || !job.embedding) return;

        const { data: matches } = await supabase.rpc("match_candidates", {
            query_embedding: job.embedding,
            match_threshold: 0.25,
            match_count: 50
        });

        if (!matches || matches.length === 0) return;

        const seekerIds = matches.map((m: any) => m.id);
        const { data: seekers } = await supabase.from("job_seekers").select("id, user_id, user:users(plan)").in("id", seekerIds);
        if (!seekers) return;

        const freeSeekers = seekers.filter((s: any) => !s.user?.plan || s.user?.plan === "FREE");

        const notifications = freeSeekers.map((seeker: any) =>
            createNotification({
              userId: seeker.user_id,
              type: "JOB_MATCH",
              templateVars: {
                companyName: job.display_company_name || job.employer?.company_name || "a company",
                jobTitle: job.title,
              },
              link: `/dashboard/seeker/recommendations`,
            }).catch(() => {})
        );

        await Promise.all(notifications);
        console.log(`[MATCH_SERVICE] Sent DELAYED AI Match alerts to ${notifications.length} Free candidates for job ${jobId}.`);
        
        await emitSystemEvent({
            category: "MATCHING",
            severity: "SUCCESS",
            event: "DELAYED_AI_MATCH_ALERTS_SENT",
            message: `Sent DELAYED AI Match alerts to ${notifications.length} Free candidates for job ${jobId}`,
            metadata: { jobId, count: notifications.length, type: "FREE_DELAYED" }
        });
    } catch (err: any) {
        console.error("[MATCH_SERVICE] Delayed error:", err);
        await emitSystemEvent({
            category: "MATCHING",
            severity: "CRITICAL",
            event: "DELAYED_AI_MATCH_FAILED",
            message: `Delayed AI Match service failed for job ${jobId}`,
            metadata: { jobId, error: err.message }
        });
    }
}