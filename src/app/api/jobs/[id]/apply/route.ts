import { validateAuth } from "@/lib/auth-guard";
import { evaluateCandidateMatch } from "@/lib/candidate-match";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ScreeningAnswer } from "@/types";
import { sendNewApplicationEmail } from "@/lib/resend";
import { createNotification } from "@/lib/notifications";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: jobId } = await params;
    const auth = await validateAuth(["JOB_SEEKER"], false, true);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();
    let body: { screeningAnswers?: Record<string, ScreeningAnswer> } = {};
    try {
        body = await request.json();
    } catch {
        body = {};
    }

    // Verify the job exists and is active
    const { data: job, error: jobError } = await supabase
        .from("jobs")
        .select("id, title, employer_id, status, deadline, skills, must_have_skills, nice_to_have_skills, minimum_years_experience, qualification, screening_questions")
        .eq("id", jobId)
        .single();

    if (jobError || !job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status !== "ACTIVE") {
        return NextResponse.json({ error: "This job is no longer accepting applications" }, { status: 400 });
    }

    if (job.deadline && new Date(job.deadline) < new Date()) {
        return NextResponse.json({ error: "The application deadline has passed" }, { status: 400 });
    }

    const { data: block } = await supabase
        .from("user_blocks")
        .select("id")
        .eq("user_id", auth.userId)
        .eq("blocked_user_id", (job as any).employer_id)
        .single();

    if (block?.id) {
        return NextResponse.json({ error: "You have blocked this employer. Unblock to apply." }, { status: 403 });
    }

    // Verify seeker profile is 100% complete
    const { data: seekerProfile } = await supabase
        .from("job_seekers")
        .select("completion, is_subscribed, skills, experience, qualification")
        .eq("id", auth.userId)
        .single();

    if (!seekerProfile || seekerProfile.completion < 60) {
        return NextResponse.json(
            { error: "Please complete your profile to at least 60% before applying for jobs" },
            { status: 403 }
        );
    }

    const requiredQuestions = ((job.screening_questions as any[]) || []).filter((question) => question.required);
    const missingRequiredAnswer = requiredQuestions.find((question) => !body.screeningAnswers?.[question.id]);
    if (missingRequiredAnswer) {
        return NextResponse.json(
            { error: `Please answer the required question: ${missingRequiredAnswer.question}` },
            { status: 400 }
        );
    }

    // Limit non-subscribed users to 1 application per month
    if (!seekerProfile.is_subscribed) {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const { count } = await supabase
            .from("applications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", auth.userId)
            .gte("created_at", startOfMonth);

        if ((count || 0) >= 1) {
            return NextResponse.json(
                { error: "You have reached your 1 application per month limit. Upgrade to Premium for unlimited applications." },
                { status: 403 }
            );
        }
    }

    const screeningResult = evaluateCandidateMatch(
        {
            skills: seekerProfile.skills || [],
            experience: seekerProfile.experience || [],
            qualification: seekerProfile.qualification || null,
        },
        job,
        body.screeningAnswers || {}
    );

    // Check for existing application
    const { data: existing } = await supabase
        .from("applications")
        .select("id")
        .eq("job_id", jobId)
        .eq("user_id", auth.userId)
        .single();

    if (existing) {
        return NextResponse.json({ error: "You have already applied to this job" }, { status: 409 });
    }

    // Insert application
    const { error: insertError } = await supabase
        .from("applications")
        .insert({
            job_id: jobId,
            user_id: auth.userId,
            status: "PENDING",
            screening_answers: body.screeningAnswers || {},
            screening_score: screeningResult.score,
            screening_summary: screeningResult.summary,
            screening_breakdown: screeningResult.breakdown,
            meets_required_criteria: screeningResult.meetsRequiredCriteria,
        });

    if (insertError) {
        // Handle race condition duplicate
        if (insertError.code === "23505") {
            return NextResponse.json({ error: "You have already applied to this job" }, { status: 409 });
        }
        console.error("Apply POST error:", insertError);
        return NextResponse.json({ error: "Failed to submit application" }, { status: 500 });
    }

    const [{ data: employer }, { data: seekerUser }] = await Promise.all([
        supabase
            .from("employers")
            .select("company_name")
            .eq("id", (job as any).employer_id)
            .single(),
        supabase
            .from("users")
            .select("email, job_seekers(full_name)")
            .eq("id", auth.userId)
            .single(),
    ]);

    if (!employerUser?.email) {
        console.warn(`[NOTIFICATION_DEBUG] SKIPPED: Employer ${job.employer_id} has no email or user record.`);
    }

    if (employerUser?.email) {
        console.log(`[NOTIFICATION_DEBUG] INITIATING: Creating notification for employer ${job.employer_id} (${employerUser.email})`);
        try {
            await Promise.all([
                sendNewApplicationEmail(employerUser.email, {
                    employerName: employer?.company_name || "Employer",
                    jobTitle: (job as any).title || "your role",
                    candidateName: (seekerUser as any)?.job_seekers?.full_name || "A candidate",
                }),
                createNotification({
                    userId: (job as any).employer_id,
                    title: "New Job Application",
                    message: `${(seekerUser as any)?.job_seekers?.full_name || "A candidate"} applied for ${(job as any).title}`,
                    type: "NEW_APPLICATION",
                    link: `/dashboard/employer/candidates`
                })
            ]);
        } catch (notifyError) {
            console.error("Non-blocking notification error in Apply API:", notifyError);
            // We don't fail the request here, as the application was already saved
        }
    }

    // Refresh seeker and employer dashboards
    revalidatePath("/", "layout");
    revalidatePath("/dashboard/seeker/applications");
    revalidatePath("/dashboard/employer/candidates");

    return NextResponse.json({
        success: true,
        message: "Application submitted successfully",
        screening: screeningResult,
    });
}
