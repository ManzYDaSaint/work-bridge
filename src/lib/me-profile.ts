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
            employer:employers!employers_user_id_fkey(
                *,
                jobs(id)
            )
        `)
        .eq("id", userId)
        .single();

    if (userError || !userData) {
        return { profile: null, error: "not_found" };
    }

    // PostgREST 1-to-many embedding returns an array or null
    const rawEmployer = Array.isArray(userData.employer) ? userData.employer[0] : userData.employer;
    let resolvedEmployer = rawEmployer;

    // Fallback: If userData.employer is null (e.g. decoupled user_id on claimed employer or dropped FK), fetch by user_id or id
    if (!resolvedEmployer && userData.role === "EMPLOYER") {
        const { data: empByUserId } = await supabase
            .from("employers")
            .select(`
                *,
                jobs(id)
            `)
            .or(`user_id.eq.${userId},id.eq.${userId}`)
            .maybeSingle();

        if (empByUserId) {
            resolvedEmployer = empByUserId;
        }
    }

    const { data: activePremium } = await supabase
        .from("premium_subscriptions")
        .select("id, ends_at")
        .eq("seeker_id", userId)
        .eq("status", "ACTIVE")
        .gt("ends_at", new Date().toISOString())
        .maybeSingle();

    const isPremium = Boolean(userData.jobSeeker?.is_subscribed || activePremium);

    const profile: User = {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        plan: isPremium ? 'PREMIUM' : 'FREE',
        createdAt: userData.created_at,
        onboardingCompletedAt: userData.onboarding_completed_at ?? null,
        jobSeeker: userData.jobSeeker
            ? {
                  id: userData.jobSeeker.id,
                  full_name: userData.jobSeeker.full_name,
                  bio: userData.jobSeeker.bio,
                  location: userData.jobSeeker.location,
                  phone: userData.jobSeeker.phone,
                  whatsapp: userData.jobSeeker.whatsapp ?? false,
                  qualification: userData.jobSeeker.qualification ?? null,
                  skills: userData.jobSeeker.skills,
                  salaryExpectation: userData.jobSeeker.salary_expectation,
                  salary_expectation: userData.jobSeeker.salary_expectation,
                  seniorityLevel: userData.jobSeeker.seniority_level,
                  seniority_level: userData.jobSeeker.seniority_level,
                  employmentType: userData.jobSeeker.employment_type,
                  employment_type: userData.jobSeeker.employment_type,
                  experience: userData.jobSeeker.experience || [],
                  completion: userData.jobSeeker.completion,
                  isSubscribed: userData.jobSeeker.is_subscribed,
                  avatarUrl: userData.jobSeeker.avatar_url,
                  avatar_url: userData.jobSeeker.avatar_url,
                  hasBadge: userData.jobSeeker.has_badge ?? false,
                  education: userData.jobSeeker.education || [],
                  preferredWorkModes: userData.jobSeeker.preferred_work_modes || [],
                  preferredJobTypes: userData.jobSeeker.preferred_job_types || [],
                  preferredLocations: userData.jobSeeker.preferred_locations || [],
                  preferredSkills: userData.jobSeeker.preferred_skills || [],
                  publicSlug: userData.jobSeeker.public_slug ?? null,
              }
            : undefined,
        employer: resolvedEmployer
            ? {
                  id: resolvedEmployer.id,
                  company_name: resolvedEmployer.company_name,
                  companyName: resolvedEmployer.company_name,
                  industry: resolvedEmployer.industry,
                  location: resolvedEmployer.location,
                  website: resolvedEmployer.website,
                  description: resolvedEmployer.description,
                  status: resolvedEmployer.status,
                  logo_url: resolvedEmployer.logo_url,
                  logoUrl: resolvedEmployer.logo_url,
                  profile_views: resolvedEmployer.profile_views ?? 0,
                  recruiterVerified: resolvedEmployer.recruiter_verified ?? false,
                  _count: {
                      jobs: resolvedEmployer.jobs?.length || 0,
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
        employer: resolvedEmployer || null,
        completedAt: userData.onboarding_completed_at,
    });

    return { profile, error: null };
}
