import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const auth = await validateAuth();
    if (auth.error) return auth.error;
    if (auth.role !== "EMPLOYER" && auth.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();

    // Fetch the job's required skills
    const { data: job, error: jobError } = await supabase
        .from("jobs")
        .select("title, skills, must_have_skills, nice_to_have_skills, seniority_level: qualification")
        .eq("id", params.id)
        .single();

    if (jobError || !job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const allJobSkills = [
        ...(job.skills || []),
        ...(job.must_have_skills || []),
        ...(job.nice_to_have_skills || []),
    ].filter(Boolean);

    if (allJobSkills.length === 0) {
        return NextResponse.json({ matches: [], job_title: job.title });
    }

    // Find seekers whose skills overlap with job skills (using Postgres array overlap operator)
    const { data: matches, error } = await supabase
        .from("job_seekers")
        .select("id, full_name, bio, location, skills, avatar_url, seniority_level, employment_type, search_intent, profile_visibility")
        .neq("profile_visibility", "HIDDEN")
        .overlaps("skills", allJobSkills)
        .limit(12);

    if (error) {
        return NextResponse.json({ error: "Failed to find matches" }, { status: 500 });
    }

    // Mask anonymous candidates
    const maskedMatches = (matches || []).map(seeker => {
        const isAnonymous = seeker.profile_visibility === "ANONYMOUS";
        return {
            id: seeker.id,
            full_name: isAnonymous ? "Anonymous Candidate" : seeker.full_name,
            bio: seeker.bio,
            location: isAnonymous ? null : seeker.location,
            skills: seeker.skills || [],
            avatar_url: isAnonymous ? null : seeker.avatar_url,
            seniority_level: seeker.seniority_level,
            employment_type: seeker.employment_type,
            search_intent: seeker.search_intent,
            profile_visibility: seeker.profile_visibility,
        };
    });

    return NextResponse.json({ matches: maskedMatches, job_title: job.title });
}
