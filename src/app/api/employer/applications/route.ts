import { validateAuth } from "@/lib/auth-guard";
import { evaluateCandidateMatch } from "@/lib/candidate-match";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const auth = await validateAuth(["EMPLOYER"]);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();
    const employerId = auth.userId;

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    let query = supabase
        .from("applications")
        .select(`
            *,
            job:jobs(*),
            user:users!applications_user_id_fkey(
                id,
                email,
                jobSeeker:job_seekers(*)
            )
        `)
        .order("created_at", { ascending: false });

    if (jobId) {
        query = query.eq("job_id", jobId);
    } else {
        query = query.filter("job.employer_id", "eq", employerId);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Employer Applications GET error:", error);
        return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
    }

    const formattedData = await Promise.all(data.map(async (app) => {
        const seeker = (app.user as any)?.jobSeeker;
        const job = app.job;
        const screeningAnswers = (app as any).screening_answers || {};
        const screeningScore = (app as any).screening_score;
        const meetsRequiredCriteria = (app as any).meets_required_criteria;
        const screeningSummary = (app as any).screening_summary;
        const screeningBreakdown = (app as any).screening_breakdown;
        const fallbackResult = seeker && job
            ? evaluateCandidateMatch(
                {
                    skills: seeker.skills || [],
                    experience: seeker.experience || [],
                    qualification: seeker.qualification || null,
                },
                job,
                screeningAnswers
            )
            : null;

        return {
            id: app.id,
            jobId: app.job_id,
            userId: app.user_id,
            status: app.status,
            createdAt: app.created_at,
            screeningScore: screeningScore ?? fallbackResult?.score ?? 0,
            meetsRequiredCriteria: meetsRequiredCriteria ?? fallbackResult?.meetsRequiredCriteria ?? false,
            screeningSummary: screeningSummary ?? fallbackResult?.summary ?? "",
            screeningBreakdown: screeningBreakdown ?? fallbackResult?.breakdown ?? [],
            screeningAnswers,
            matchedSkills: fallbackResult?.matchedSkills ?? [],
            missingSkills: fallbackResult?.missingSkills ?? [],
            yearsExperience: fallbackResult?.yearsExperience ?? 0,
            job: app.job ? {
                id: app.job.id,
                title: app.job.title,
                must_have_skills: (app.job as any).must_have_skills || [],
                nice_to_have_skills: (app.job as any).nice_to_have_skills || [],
                minimum_years_experience: (app.job as any).minimum_years_experience || 0,
                qualification: (app.job as any).qualification || null,
            } : undefined,
            user: app.user ? {
                id: app.user.id,
                email: app.user.email,
                jobSeeker: (app.user as any).jobSeeker ? {
                    full_name: (app.user as any).jobSeeker.full_name,
                    skills: (app.user as any).jobSeeker.skills,
                    location: (app.user as any).jobSeeker.location,
                    bio: (app.user as any).jobSeeker.bio,
                    experience: (app.user as any).jobSeeker.experience,
                    education: (app.user as any).jobSeeker.education,
                    qualification: (app.user as any).jobSeeker.qualification || null,
                } : undefined
            } : undefined
        };
    }));

    return NextResponse.json(formattedData);
}
