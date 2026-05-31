import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { validateAuth } from "@/lib/auth-guard";
import { isOnboardingComplete } from "@/lib/onboarding";
import { JobSeekerOnboarding, EmployerOnboarding } from "./client";

// Force no caching — always read the latest profile from the DB
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
    const auth = await validateAuth();
    if (auth.error || !auth.user) redirect("/login");

    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase
        .from("users")
        .select(`
            *,
            jobSeeker:job_seekers(*),
            employer:employers(*)
        `)
        .eq("id", auth.user.id)
        .single();

    if (!userData) redirect("/login");

    const complete = isOnboardingComplete({
        role: userData.role,
        seeker: userData.jobSeeker || null,
        employer: userData.employer || null,
        completedAt: userData.onboarding_completed_at,
    });
    if (complete) redirect("/dashboard");

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

    if (me.role === "JOB_SEEKER") return <JobSeekerOnboarding me={me} />;
    if (me.role === "EMPLOYER") return <EmployerOnboarding me={me} />;

    redirect("/dashboard");
}
