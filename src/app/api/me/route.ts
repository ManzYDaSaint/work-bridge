import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    // Fetch profile and role-specific data
    const { data: userData, error: userError } = await supabase
        .from("users")
        .select(`
            *,
            jobSeeker:job_seekers(*),
            employer:employers(*)
        `)
        .eq("id", auth.userId)
        .single();

    if (userError || !userData) {
        return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const profile = {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        createdAt: userData.created_at,
        jobSeeker: userData.jobSeeker ? {
            id: userData.jobSeeker.id,
            fullName: userData.jobSeeker.full_name,
            bio: userData.jobSeeker.bio,
            location: userData.jobSeeker.location,
            skills: userData.jobSeeker.skills,
            resumeUrl: userData.jobSeeker.resume_url,
            salaryExpectation: userData.jobSeeker.salary_expectation,
            seniorityLevel: userData.jobSeeker.seniority_level,
            employmentType: userData.jobSeeker.employment_type,
            experience: userData.jobSeeker.experience || [],
            completion: userData.jobSeeker.completion,
            isSubscribed: userData.jobSeeker.is_subscribed,
            anonymizedSummary: userData.jobSeeker.anonymized_summary,
            topVerificationTier: userData.jobSeeker.top_verification_tier,
            avatarUrl: userData.jobSeeker.avatar_url,
            hasBadge: userData.jobSeeker.has_badge ?? false,
            badgeSeekerNumber: userData.jobSeeker.badge_seeker_number,
        } : undefined,
        employer: userData.employer ? {
            id: userData.employer.id,
            companyName: userData.employer.company_name,
            industry: userData.employer.industry,
            location: userData.employer.location,
            status: userData.employer.status
        } : undefined
    };

    return NextResponse.json(profile);
}
