import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Orchestrates the matching and notification process
 */
export async function runJobMatchingOrchestration() {
  // 1. Fetch new jobs
  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("status", "ACTIVE");

  if (!jobs) return;

  for (const job of jobs) {
    // 2. Identify Premium candidates with high match potential
    // This uses the pgvector match_candidates function defined in schema.sql
    const { data: matches } = await supabase.rpc("match_candidates", {
      query_embedding: job.embedding,
      match_threshold: 0.8 // Threshold for "High Match"
    });

    if (!matches) continue;

    for (const match of matches) {
      // 3. Verify Premium Subscription status
      const { data: sub } = await supabase
        .from("premium_subscriptions")
        .select("*")
        .eq("seeker_id", match.id)
        .eq("status", "ACTIVE")
        .single();

      if (sub) {
        // 4. Queue WhatsApp notification
        await supabase.from("notification_queue").insert({
          seeker_id: match.id,
          job_id: job.id,
          template_id: "new_job_match",
          payload: {
            jobTitle: job.title,
            company: job.display_company_name,
            matchScore: Math.round(match.similarity * 100)
          },
          status: "PENDING"
        });
      }
    }
  }
}
