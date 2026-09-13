import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  scoreJobSeekerMatch,
  SeekerProfile,
  resolveHighestEducationQualification,
} from "@/lib/matching-helpers";

export async function GET(request: Request) {
  const auth = await validateAuth(["ADMIN"], false);
  if (auth.error) return auth.error;

  const supabase = getSupabaseAdminClient();
  if (!supabase)
    return NextResponse.json({ error: "Admin DB unavailable" }, { status: 500 });

  const nowIso = new Date().toISOString();

  // 1. Fetch active premium subscriptions
  const { data: activeSubs } = await supabase
    .from("premium_subscriptions")
    .select("seeker_id, ends_at, status")
    .eq("status", "ACTIVE")
    .gt("ends_at", nowIso);

  const premiumSeekerIds = (activeSubs || []).map((s: any) => s.seeker_id);

  // 2. Fetch seekers
  const { data: seekers } = await supabase
    .from("job_seekers")
    .select(
      "id, user_id, full_name, qualification, education, skills, experience, location, phone, notification_preferences(whatsapp_enabled, min_match_score)"
    )
    .in("id", premiumSeekerIds.length ? premiumSeekerIds : ["__none__"]);

  // 3. Fetch active jobs
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, qualification, minimum_years_experience, must_have_skills, display_company_name")
    .eq("status", "ACTIVE");

  const results: any[] = [];

  for (const seeker of seekers || []) {
    const prefs = Array.isArray(seeker.notification_preferences)
      ? seeker.notification_preferences[0]
      : seeker.notification_preferences;

    const resolvedQual =
      resolveHighestEducationQualification(seeker.qualification, seeker.education) ||
      seeker.qualification;

    const seekerProfile: SeekerProfile = {
      qualification: resolvedQual || null,
      skills: seeker.skills || [],
      experience: seeker.experience || [],
      education: seeker.education || [],
      certifications: [],
    };

    const seekerEntry: any = {
      seekerId: seeker.id,
      name: seeker.full_name,
      qualification: seeker.qualification,
      resolvedQual,
      hasPhone: !!seeker.phone,
      whatsappEnabled: prefs?.whatsapp_enabled,
      minThreshold: prefs?.min_match_score || 50,
      matches: [],
    };

    for (const job of jobs || []) {
      const ruleMatch = scoreJobSeekerMatch(job, seekerProfile);
      const qualScore = ruleMatch.breakdown.qualification.score;
      const passedKnockout = !(job.qualification && qualScore === 0);

      seekerEntry.matches.push({
        jobId: job.id,
        jobTitle: job.title,
        company: job.display_company_name,
        qualRequired: job.qualification,
        qualScore,
        passedKnockout,
        expScore: ruleMatch.breakdown.experience.score,
        expActual: ruleMatch.breakdown.experience.actual,
        expRequired: ruleMatch.breakdown.experience.required,
        skillScore: ruleMatch.breakdown.skills.score,
        ruleScore: ruleMatch.score,
        reasons: ruleMatch.reasons,
        wouldQueueForApproval: passedKnockout && ruleMatch.score >= 1,
        wouldAutoDispatch:
          !!seeker.phone &&
          prefs?.whatsapp_enabled !== false &&
          passedKnockout &&
          ruleMatch.score >= (prefs?.min_match_score || 50),
      });
    }

    results.push(seekerEntry);
  }

  return NextResponse.json({
    premiumSeekerCount: premiumSeekerIds.length,
    activeJobCount: jobs?.length || 0,
    seekersFound: seekers?.length || 0,
    diagnostics: results,
  });
}

export const dynamic = "force-dynamic";
