import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();
    const { data: profile, error } = await supabase
        .from("job_seekers")
        .select("*")
        .eq("id", auth.userId)
        .single();

    if (error && error.code !== "PGRST116") {
        console.error("Profile GET error:", error);
        return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }

    if (!profile) {
        return NextResponse.json({
            fullName: "",
            bio: "",
            location: "",
            skills: [],
            completion: 0
        });
    }

    return NextResponse.json({
        id: profile.id,
        fullName: profile.full_name,
        bio: profile.bio,
        location: profile.location,
        skills: profile.skills,
        salaryExpectation: profile.salary_expectation,
        seniorityLevel: profile.seniority_level,
        employmentType: profile.employment_type,
        experience: profile.experience || [],
        completion: profile.completion,
        isSubscribed: profile.is_subscribed
    });
}

export async function PUT(request: Request) {
    const auth = await validateAuth(undefined, true);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const body = await request.json();

        let completion = 0;
        if (body.fullName && body.fullName.trim() !== "") completion += 20;
        if (body.bio && body.bio.trim() !== "") completion += 30;
        if (body.location && body.location.trim() !== "") completion += 20;
        if (body.skills && body.skills.length > 0) completion += 20;
        if (body.experience && body.experience.length > 0) completion += 10;

        const { data, error } = await supabase
            .from("job_seekers")
            .upsert({
                id: auth.userId,
                full_name: body.fullName,
                bio: body.bio,
                location: body.location,
                skills: body.skills || [],
                experience: body.experience || [],
                salary_expectation: body.salaryExpectation,
                seniority_level: body.seniorityLevel,
                employment_type: body.employmentType,
                completion
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, profile: data });
    } catch (error: any) {
        console.error("Profile PUT error:", error);
        return NextResponse.json({ error: error.message || "Failed to update profile" }, { status: 500 });
    }
}
