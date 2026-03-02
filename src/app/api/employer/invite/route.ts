import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { jobId, seekerId } = await request.json();

        // 1. Verify this employer owns the job
        const { data: job, error: jobError } = await supabase
            .from("jobs")
            .select("id, title")
            .eq("id", jobId)
            .eq("employer_id", user.id)
            .single();

        if (jobError || !job) {
            return NextResponse.json({ error: "Job not found or access denied" }, { status: 403 });
        }

        // 2. Create an "INVITED" application record
        // Note: Using 'PENDING' if 'INVITED' isn't in your DB yet, 
        // but we'll include 'INVITED' in the security patch migration.
        const { error: appError } = await supabase
            .from("applications")
            .upsert({
                job_id: jobId,
                user_id: seekerId,
                status: "INVITED"
            }, { onConflict: "job_id, user_id" });

        if (appError) {
            console.error("Invite application error:", appError);
            return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 });
        }

        // 3. Trigger a high-priority notification to the seeker
        const { data: employer } = await supabase
            .from("employers")
            .select("company_name")
            .eq("id", user.id)
            .single();

        await supabase.from("notifications").insert({
            user_id: seekerId,
            job_id: jobId,
            message: `✨ Profile Shortlisted: ${employer?.company_name || 'An employer'} has shortlisted you for "${job.title}"!`,
            type: "SUCCESS",
            is_read: false
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
}
