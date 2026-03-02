import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: employer, error: empError } = await supabase
        .from("employers")
        .select("id")
        .eq("id", user.id)
        .single();

    if (empError || !employer) {
        return NextResponse.json({ error: "Employer profile not found" }, { status: 404 });
    }

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

    // Join with jobs table to filter by employer_id
    if (jobId) {
        query = query.eq("job_id", jobId);
    } else {
        // This is a bit tricky with Supabase's direct JS client for cross-table filter on a separate join
        // We'll use a subquery approach if possible or filter in JS if the volume is small.
        // Better: user inner join style filter
        query = query.filter("job.employer_id", "eq", employer.id);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Employer Applications GET error:", error);
        return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
    }

    // Map to camelCase
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
