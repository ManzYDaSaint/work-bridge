import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const jobId = params.id;
        if (!jobId) {
            return NextResponse.json({ error: "Job ID required" }, { status: 400 });
        }

        const supabase = await createSupabaseServerClient();
        
        // Extract IP for basic deduplication hashing (optional, but good for analytics)
        const forwardedFor = request.headers.get("x-forwarded-for");
        const ip = forwardedFor ? forwardedFor.split(",")[0] : "unknown-ip";
        
        // Create a daily session hash: IP + JobId + Current Date String
        const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        const sessionHash = crypto.createHash("sha256").update(`${ip}-${jobId}-${dateStr}`).digest("hex");

        // Try to get authenticated user if they exist (don't fail if they aren't)
        const { data: { session } } = await supabase.auth.getSession();
        const viewerId = session?.user?.id || null;

        // Check if this exact session hash already recorded a view for this job today
        const { count } = await supabase
            .from("job_views")
            .select("*", { count: "exact", head: true })
            .eq("job_id", jobId)
            .eq("session_hash", sessionHash);

        if (count && count > 0) {
            // Already viewed today by this IP
            return NextResponse.json({ success: true, recorded: false, reason: "already_viewed_today" });
        }

        // Insert new view
        const { error } = await supabase
            .from("job_views")
            .insert({
                job_id: jobId,
                viewer_id: viewerId,
                session_hash: sessionHash,
            });

        if (error) {
            console.error("[JOB_VIEW_TRACKING] DB Insert Error:", error);
            // Don't fail the request, just swallow the error so we don't break the UI
        }

        return NextResponse.json({ success: true, recorded: true });
    } catch (error) {
        console.error("[JOB_VIEW_TRACKING] Unhandled Error:", error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
