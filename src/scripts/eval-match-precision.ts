/**
 * Evaluation script: compute rule-based match precision using current implementation.
 * Usage:
 *  - Set `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` in env.
 *  - Run with `ts-node` or compile with `tsc`.
 *
 * Example:
 *   NEXT_PUBLIC_SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=xxxx npx ts-node src/scripts/eval-match-precision.ts
 */

import fs from "fs";
import path from "path";
import { getSupabaseAdminClient } from "../lib/supabase-admin";
import { scoreJobSeekerMatch } from "../lib/matching-helpers";

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    console.error("Missing Supabase admin client. Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env vars.");
    process.exit(1);
  }

  const JOB_LIMIT = Number(process.env.EVAL_JOB_LIMIT || 100);
  const CANDIDATE_LIMIT = Number(process.env.EVAL_CANDIDATE_LIMIT || 500);

  console.log(`Fetching up to ${JOB_LIMIT} active jobs...`);
  const { data: jobs, error: jobsErr } = await admin
    .from("jobs")
    .select("id, title, embedding, must_have_skills, minimum_years_experience, qualification, required_certifications")
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false })
    .limit(JOB_LIMIT);

  if (jobsErr) {
    console.error("Failed to fetch jobs:", jobsErr);
    process.exit(1);
  }
  if (!jobs || jobs.length === 0) {
    console.log("No active jobs found.");
    process.exit(0);
  }

  const results: any[] = [];

  for (const job of jobs) {
    console.log(`Evaluating job ${job.id} - ${job.title}`);
    let candidateIds: string[] = [];

    if (job.embedding) {
      try {
        const { data: candidates, error: candErr } = await admin.rpc("match_candidates", {
          query_embedding: job.embedding,
          match_threshold: 0.01,
          match_count: CANDIDATE_LIMIT,
        });
        if (candErr) {
          console.warn(`match_candidates RPC error for job ${job.id}:`, candErr.message || candErr);
        } else if (Array.isArray(candidates)) {
          candidateIds = candidates.map((c: any) => c.id).slice(0, CANDIDATE_LIMIT);
        }
      } catch (err: any) {
        console.warn(`RPC call failed for job ${job.id}:`, err.message || err);
      }
    }

    // Fallback: if no candidates from embedding, sample recent seekers
    if (candidateIds.length === 0) {
      const { data: recentSeekers, error: seekErr } = await admin
        .from("job_seekers")
        .select("id")
        .order("updated_at", { ascending: false })
        .limit(Math.min(CANDIDATE_LIMIT, 500));
      if (seekErr) console.warn("Failed to fetch recent seekers fallback:", seekErr);
      else candidateIds = (recentSeekers || []).map((s: any) => s.id).slice(0, CANDIDATE_LIMIT);
    }

    if (candidateIds.length === 0) {
      console.log(`No candidates for job ${job.id}, skipping.`);
      continue;
    }

    // Fetch seeker rows in batches
    const seekerChunks = chunkArray(candidateIds, 200);
    let totalConsidered = 0;
    let totalMatched = 0;
    let scoreSum = 0;
    const scoreBuckets: Record<string, number> = { '90+': 0, '80-89': 0, '70-79': 0, '60-69': 0, '<60': 0 };

    for (const chunk of seekerChunks) {
      const { data: seekers, error: seekersErr } = await admin
        .from("job_seekers")
        .select("id, full_name, skills, experience, qualification, certifications")
        .in("id", chunk);
      if (seekersErr) {
        console.warn("Failed to fetch seekers chunk:", seekersErr);
        continue;
      }
      for (const s of (seekers || [])) {
        totalConsidered += 1;
        const structured = scoreJobSeekerMatch(job, {
          skills: s.skills || [],
          experience: s.experience || [],
          qualification: s.qualification || null,
          certifications: s.certifications || [],
        });
        if (structured.passed) totalMatched += 1;
        scoreSum += structured.score;
        const sc = structured.score;
        if (sc >= 90) scoreBuckets['90+'] += 1;
        else if (sc >= 80) scoreBuckets['80-89'] += 1;
        else if (sc >= 70) scoreBuckets['70-79'] += 1;
        else if (sc >= 60) scoreBuckets['60-69'] += 1;
        else scoreBuckets['<60'] += 1;
      }
    }

    const avgScore = totalConsidered > 0 ? Math.round((scoreSum / totalConsidered) * 10) / 10 : 0;
    const matchRate = totalConsidered > 0 ? Math.round((totalMatched / totalConsidered) * 1000) / 10 : 0; // percent

    const summary = {
      jobId: job.id,
      title: job.title,
      candidatesConsidered: totalConsidered,
      matchedCount: totalMatched,
      matchRatePercent: matchRate,
      avgScore,
      scoreBuckets,
    };
    console.log(JSON.stringify(summary, null, 2));
    results.push(summary);
  }

  const overall = {
    jobsEvaluated: results.length,
    jobSummaries: results,
    generatedAt: new Date().toISOString(),
  };

  const outPath = path.resolve(process.cwd(), "match-eval.json");
  fs.writeFileSync(outPath, JSON.stringify(overall, null, 2));
  console.log(`Wrote report to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
