import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch profile and role-specific data
    const { data: userData, error: userError } = await supabase
        .from("users")
        .select(`
            *,
            jobSeeker:job_seekers(*),
            employer:employers(*)
        `)
        .eq("id", user.id)
        .single();

    if (userError || !userData) {
        return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Map database snake_case to camelCase for the frontend if needed, 
    // but the types/index.ts seems to expect camelCase.
    // Let's ensure the mapping is consistent with the User interface.

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
            highestQualificationUrl: userData.jobSeeker.highest_qualification_url,
            salaryExpectation: userData.jobSeeker.salary_expectation,
            seniorityLevel: userData.jobSeeker.seniority_level,
            employmentType: userData.jobSeeker.employment_type,
            experience: userData.jobSeeker.experience || [],
            completion: userData.jobSeeker.completion,
            isSubscribed: userData.jobSeeker.is_subscribed
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
