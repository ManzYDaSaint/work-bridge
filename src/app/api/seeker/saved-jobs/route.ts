import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
    const auth = await validateAuth(['JOB_SEEKER'], true, true);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from("saved_jobs")
        .select(`
            id,
            job_id,
            created_at,
            job:jobs(
                id,
                title,
                location,
                type,
                salary_range,
                employer:employers(company_name, id)
            )
        `)
        .eq("seeker_id", auth.userId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Saved Jobs GET error:", error);
        return NextResponse.json({ error: "Failed to fetch saved jobs" }, { status: 500 });
    }

    return NextResponse.json(data);
}

export async function POST(request: Request) {
    const auth = await validateAuth(['JOB_SEEKER'], true, true);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const { jobId } = await request.json();

        if (!jobId) {
            return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
        }

        // Toggle logic: Check if already saved
        const { data: existing } = await supabase
            .from("saved_jobs")
            .select("id")
            .eq("seeker_id", auth.userId)
            .eq("job_id", jobId)
            .single();

        if (existing) {
            // Unsave (Remove)
            const { error: deleteError } = await supabase
                .from("saved_jobs")
                .delete()
                .eq("id", existing.id);

            if (deleteError) throw deleteError;
            return NextResponse.json({ saved: false });
        } else {
            // Save (Insert)
            const { error: insertError } = await supabase
                .from("saved_jobs")
                .insert({
                    seeker_id: auth.userId,
                    job_id: jobId
                });

            if (insertError) throw insertError;
            return NextResponse.json({ saved: true });
        }
    } catch (error: any) {
        console.error("Saved Jobs POST error:", error);
        return NextResponse.json({ error: error.message || "Failed to toggle saved job" }, { status: 500 });
    }
}
