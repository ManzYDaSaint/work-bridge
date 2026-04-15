import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@/types";
import { isOnboardingComplete } from "@/lib/onboarding";

/**
 * Builds the same `User` payload as GET /api/me (for server layouts and the API route).
 */
export async function buildMeProfile(
    supabase: SupabaseClient,
    userId: string
): Promise<{ profile: User | null; error: "not_found" | null }> {
    const { data: userData, error: userError } = await supabase
        .from("users")
        .select(`
            *,
            jobSeeker:job_seekers(*),
            employer:employers(
                *,
                jobs(id)
            )
        `)
        .eq("id", userId)
        .single();

    if (userError || !userData) {
        return { profile: null, error: "not_found" };
    }

    const profile: User = {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        createdAt: userData.created_at,
        onboardingCompletedAt: userData.onboarding_completed_at ?? null,
        jobSeeker: userData.jobSeeker
            ? {
                  id: userData.jobSeeker.id,
                  full_name: userData.jobSeeker.full_name,
                  bio: userData.jobSeeker.bio,
                  location: userData.jobSeeker.location,
                  skills: userData.jobSeeker.skills,
                  salaryExpectation: userData.jobSeeker.salary_expectation,
                  seniorityLevel: userData.jobSeeker.seniority_level,
                  employmentType: userData.jobSeeker.employment_type,
                  experience: userData.jobSeeker.experience || [],
                  completion: userData.jobSeeker.completion,
                  isSubscribed: userData.jobSeeker.is_subscribed,
                  avatarUrl: userData.jobSeeker.avatar_url,
                  hasBadge: userData.jobSeeker.has_badge ?? false,
                  education: userData.jobSeeker.education || [],
                  preferredWorkModes: userData.jobSeeker.preferred_work_modes || [],
                  preferredJobTypes: userData.jobSeeker.preferred_job_types || [],
                  preferredLocations: userData.jobSeeker.preferred_locations || [],
                  preferredSkills: userData.jobSeeker.preferred_skills || [],
              }
            : undefined,
        employer: userData.employer
            ? {
                  id: userData.employer.id,
                  company_name: userData.employer.company_name,
                  companyName: userData.employer.company_name,
                  industry: userData.employer.industry,
                  location: userData.employer.location,
                  status: userData.employer.status,
                  logo_url: userData.employer.logo_url,
                  logoUrl: userData.employer.logo_url,
                  profile_views: userData.employer.profile_views ?? 0,
                  plan: userData.employer.plan || "FREE",
                  recruiterVerified: userData.employer.recruiter_verified ?? false,
                  _count: {
                      jobs: userData.employer.jobs?.length || 0,
                  },
              }
            : undefined,
    };

    if (profile.jobSeeker) {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const { count } = await supabase
            .from("applications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("created_at", startOfMonth);

        profile.jobSeeker.applicationsThisMonth = count || 0;
    }

    profile.onboardingComplete = isOnboardingComplete({
        role: profile.role,
        seeker: userData.jobSeeker || null,
        employer: userData.employer || null,
        completedAt: userData.onboarding_completed_at,
    });

    return { profile, error: null };
}
