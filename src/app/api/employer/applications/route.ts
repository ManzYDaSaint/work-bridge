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

    // If filtering by a specific job, verify ownership first
    if (jobId) {
        const { data: ownedJob } = await supabase
            .from("jobs")
            .select("id")
            .eq("id", jobId)
            .eq("employer_id", employerId)
            .single();

        if (!ownedJob) {
            return NextResponse.json({ error: "Job not found or unauthorized" }, { status: 403 });
        }
    }

    // Fetch this employer's own job IDs to use as a DB-level filter
    const { data: ownedJobs, error: jobsError } = await supabase
        .from("jobs")
        .select("id")
        .eq("employer_id", employerId);

    if (jobsError) {
        return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
    }

    const ownedJobIds = (ownedJobs || []).map((j) => j.id);
    if (ownedJobIds.length === 0) {
        return NextResponse.json([]);
    }

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
        .in("job_id", jobId ? [jobId] : ownedJobIds)
        .order("created_at", { ascending: false });

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

        const isAnonymous = seeker?.profile_visibility === "ANONYMOUS";

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
                jobSeeker: seeker ? {
                    full_name: isAnonymous ? "Anonymous Candidate" : seeker.full_name,
                    skills: seeker.skills,
                    location: isAnonymous ? null : seeker.location,
                    bio: seeker.bio,
                    experience: seeker.experience,
                    education: seeker.education,
                    qualification: seeker.qualification || null,
                    avatar_url: isAnonymous ? null : seeker.avatar_url,
                    profile_visibility: seeker.profile_visibility,
                } : undefined
            } : undefined
        };
    }));

    return NextResponse.json(formattedData);
}
