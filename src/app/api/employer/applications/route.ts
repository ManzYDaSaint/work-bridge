import { validateAuth } from "@/lib/auth-guard";
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

    const formattedData = data.map(app => ({
        id: app.id,
        jobId: app.job_id,
        userId: app.user_id,
        status: app.status,
        createdAt: app.created_at,
        job: app.job ? {
            id: app.job.id,
            title: app.job.title,
        } : undefined,
        user: app.user ? {
            id: app.user.id,
            email: app.user.email,
            jobSeeker: (app.user as any).jobSeeker ? {
                fullName: (app.user as any).jobSeeker.full_name,
                skills: (app.user as any).jobSeeker.skills,
                resumeUrl: (app.user as any).jobSeeker.resume_url,
                location: (app.user as any).jobSeeker.location,
            } : undefined
        } : undefined
    }));

    return NextResponse.json(formattedData);
}
