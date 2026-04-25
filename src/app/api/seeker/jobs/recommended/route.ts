import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const auth = await validateAuth();
    if (auth.error) return auth.error;
    if (auth.role !== "JOB_SEEKER") {
        return NextResponse.json({ error: "Only job seekers can view recommendations" }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();

    // Get the seeker's skills
    const { data: seeker, error: seekerError } = await supabase
        .from("job_seekers")
        .select("skills, seniority_level, employment_type")
        .eq("id", auth.userId)
        .single();

    if (seekerError || !seeker || !seeker.skills?.length) {
        return NextResponse.json({ jobs: [] });
    }

    // Find active jobs whose skills overlap with the seeker's skills
    const { data: jobs, error } = await supabase
        .from("jobs")
        .select(`
            id,
            title,
            location,
            type,
            work_mode,
            skills,
            salary_range,
            deadline,
            created_at,
            employers (
                id,
                company_name,
                logo_url
            )
        `)
        .eq("status", "ACTIVE")
        .overlaps("skills", seeker.skills)
        .order("created_at", { ascending: false })
        .limit(6);

    if (error) {
        return NextResponse.json({ error: "Failed to load recommendations" }, { status: 500 });
    }

    return NextResponse.json({ jobs: jobs || [] });
}
