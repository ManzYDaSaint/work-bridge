import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isOnboardingComplete } from "@/lib/onboarding";
import { JobSeekerOnboarding, EmployerOnboarding } from "./client";

// Force no caching — always read the latest profile from the DB
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
    const supabase = await createSupabaseServerClient();

    // 1. Auth check — redirect to login if no session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // 2. Fetch the user profile (same query as /api/me)
    const { data: userData } = await supabase
        .from("users")
        .select(`
            *,
            jobSeeker:job_seekers(*),
            employer:employers(*)
        `)
        .eq("id", user.id)
        .single();

    if (!userData) redirect("/login");

    // 3. If already onboarded, skip to dashboard
    const complete = isOnboardingComplete({
        role: userData.role,
        seeker: userData.jobSeeker || null,
        employer: userData.employer || null,
        completedAt: userData.onboarding_completed_at,
    });
    if (complete) redirect("/dashboard");

    // 4. Build the same `me` shape that the client components expect
    const me = {
        role: userData.role as "JOB_SEEKER" | "EMPLOYER" | "ADMIN",
        onboardingComplete: false,
        jobSeeker: userData.jobSeeker
            ? {
                full_name: userData.jobSeeker.full_name ?? undefined,
                location: userData.jobSeeker.location ?? undefined,
                bio: userData.jobSeeker.bio ?? undefined,
                qualification: userData.jobSeeker.qualification ?? undefined,
                skills: userData.jobSeeker.skills ?? [],
                seniorityLevel: userData.jobSeeker.seniority_level ?? undefined,
                employmentType: userData.jobSeeker.employment_type ?? undefined,
                salaryExpectation: userData.jobSeeker.salary_expectation ?? undefined,
                experience: userData.jobSeeker.experience ?? [],
            }
            : undefined,
        employer: userData.employer
            ? {
                companyName: userData.employer.company_name ?? undefined,
                industry: userData.employer.industry ?? undefined,
                location: userData.employer.location ?? undefined,
            }
            : undefined,
    };

    // 5. Render the right form — data is already here, no client fetch needed
    if (me.role === "JOB_SEEKER") return <JobSeekerOnboarding me={me} />;
    if (me.role === "EMPLOYER") return <EmployerOnboarding me={me} />;

    // Admin or unknown
    redirect("/dashboard");
}
