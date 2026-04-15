import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function GET() {
    const auth = await validateAuth(["JOB_SEEKER"]);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from("job_seekers")
        .select("preferred_work_modes, preferred_job_types, preferred_locations, preferred_skills")
        .eq("id", auth.userId)
        .single();

    if (error && error.code !== "PGRST116") {
        return NextResponse.json({ error: "Failed to load preferences" }, { status: 500 });
    }

    return NextResponse.json({
        preferredWorkModes: data?.preferred_work_modes || [],
        preferredJobTypes: data?.preferred_job_types || [],
        preferredLocations: data?.preferred_locations || [],
        preferredSkills: data?.preferred_skills || [],
    });
}

export async function PUT(request: Request) {
    const auth = await validateAuth(["JOB_SEEKER"]);
    if (auth.error) return auth.error;

    const body = await request.json();
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
        .from("job_seekers")
        .upsert({
            id: auth.userId,
            preferred_work_modes: body.preferredWorkModes || [],
            preferred_job_types: body.preferredJobTypes || [],
            preferred_locations: body.preferredLocations || [],
            preferred_skills: body.preferredSkills || [],
        });

    if (error) {
        return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
    }

    // Refresh the dashboard and matching logic
    revalidatePath("/", "layout");
    revalidatePath("/dashboard/seeker");

    return NextResponse.json({ success: true });
}
