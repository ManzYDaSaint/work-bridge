import { validateAuth } from "@/lib/auth-guard";
import { evaluateCandidateMatch } from "@/lib/candidate-match";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ScreeningAnswer } from "@/types";
import { sendNewApplicationEmail } from "@/lib/resend";
import { NotificationService } from "@/services/notification.service";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: jobId } = await params;
    const auth = await validateAuth(["JOB_SEEKER"], false, false);
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
        .select("id, title, employer_id, status, deadline, skills, must_have_skills, nice_to_have_skills, minimum_years_experience, qualification, screening_questions, application_method, allow_one_tap_apply")
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

    // Guard: if one-tap is disabled for this job, block internal submissions
    if ((job as any).application_method && (job as any).application_method !== "one_tap" && !(job as any).allow_one_tap_apply) {
        return NextResponse.json({
            error: "This job does not accept applications through Aganyu. Please follow the employer's application instructions.",
        }, { status: 405 });
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
        .select("completion, is_subscribed, skills, experience, qualification, application_limit_bonus")
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

    // --- Application Limit: 10 per calendar month ---
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { count: monthlyAppCount } = await supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", auth.userId)
        .gte("created_at", startOfMonth);

    const baseLimit = 10;
    const totalLimit = baseLimit + (seekerProfile?.application_limit_bonus || 0);

    if ((monthlyAppCount || 0) >= totalLimit) {
        return NextResponse.json(
            { error: `You've reached your ${totalLimit} applications/month limit. Want more? Share your referral link with a friend and earn 5 bonus applications when they sign up!` },
            { status: 403 }
        );
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

    // --- Calculate AI Match Score ---
    const { data: seekerEmbeddingData } = await supabase
        .from("job_seekers")
        .select("embedding")
        .eq("id", auth.userId)
        .single();

    const { data: jobEmbeddingData } = await supabase
        .from("jobs")
        .select("embedding")
        .eq("id", jobId)
        .single();

    let matchScore = null;
    if (seekerEmbeddingData?.embedding && jobEmbeddingData?.embedding) {
        const sVec = seekerEmbeddingData.embedding;
        const jVec = jobEmbeddingData.embedding;
        
        // Cosine Similarity = (A . B) / (||A|| ||B||)
        // Since HF all-MiniLM embeddings are normalized, this is just the dot product
        const dotProduct = sVec.reduce((sum: number, val: number, i: number) => sum + val * (jVec[i] as number), 0);
        matchScore = dotProduct;
    }

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
            match_score: matchScore,
        });

    if (insertError) {
        // Handle race condition duplicate
        if (insertError.code === "23505") {
            return NextResponse.json({ error: "You have already applied to this job" }, { status: 409 });
        }
        console.error("Apply POST error:", insertError);
        return NextResponse.json({ error: "Failed to submit application" }, { status: 500 });
    }

    const [{ data: employer }, { data: seekerUser }, { data: employerUser }] = await Promise.all([
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
        supabase
            .from("users")
            .select("email")
            .eq("id", (job as any).employer_id)
            .single(),
    ]);

    if (!employerUser?.email) {
        console.warn(`[NOTIFICATION_DEBUG] SKIPPED: Employer ${job.employer_id} has no email or user record.`);
    }

    if (employerUser?.email) {
        console.log(`[NOTIFICATION_DEBUG] INITIATING: Creating notification for employer ${job.employer_id} (${employerUser.email})`);
        try {
            const [emailResult, notifResult] = await Promise.all([
                sendNewApplicationEmail(employerUser.email, {
                    employerName: employer?.company_name || "Employer",
                    jobTitle: (job as any).title || "your role",
                    candidateName: (seekerUser as any)?.job_seekers?.full_name || "A candidate",
                }),
                await NotificationService.createNotification({
                    userId: (job as any).employer_id,
                    title: "New Job Application",
                    message: `${(seekerUser as any)?.job_seekers?.full_name || "A candidate"} applied for ${(job as any).title}`,
                    type: "NEW_APPLICATION",
                    link: `/dashboard/employer/candidates`
                })
            ]);
            
            if (!emailResult.success) {
                console.error(`[NOTIFICATION_DEBUG] Email failed but notification may have succeeded:`, emailResult.error);
            }
            if (!notifResult) {
                console.error(`[NOTIFICATION_DEBUG] Notification failed`);
            }
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
