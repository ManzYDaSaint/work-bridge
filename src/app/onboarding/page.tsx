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
            employer:employers!employers_user_id_fkey(*)
        `)
        .eq("id", auth.user.id)
        .single();

    if (!userData) redirect("/login");

    const rawEmployer = Array.isArray(userData.employer) ? userData.employer[0] : userData.employer;
    let resolvedEmployer = rawEmployer;
    if (!resolvedEmployer && userData.role === "EMPLOYER") {
        const { data: empByUserId } = await supabase
            .from("employers")
            .select("*")
            .or(`user_id.eq.${auth.user.id},id.eq.${auth.user.id}`)
            .maybeSingle();
        if (empByUserId) {
            resolvedEmployer = empByUserId;
        }
    }

    const complete = isOnboardingComplete({
        role: userData.role,
        seeker: userData.jobSeeker || null,
        employer: resolvedEmployer || null,
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
        employer: resolvedEmployer
            ? {
                companyName: resolvedEmployer.company_name ?? undefined,
                industry: resolvedEmployer.industry ?? undefined,
                location: resolvedEmployer.location ?? undefined,
            }
            : undefined,
    };

    if (me.role === "JOB_SEEKER") return <JobSeekerOnboarding me={me} />;
    if (me.role === "EMPLOYER") return <EmployerOnboarding me={me} />;

    redirect("/dashboard");
}
