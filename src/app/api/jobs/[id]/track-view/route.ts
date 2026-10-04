import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: jobId } = await params;
        if (!jobId) {
            return NextResponse.json({ error: "Job ID required" }, { status: 400 });
        }

        // Use server client only for auth (to get viewer session)
        const supabase = await createSupabaseServerClient();
        // Use admin client for DB writes — job_views RLS blocks anonymous inserts
        const adminClient = getSupabaseAdminClient();
        if (!adminClient) {
            return NextResponse.json({ success: false, reason: "db_unavailable" });
        }

        // Extract IP for basic deduplication hashing
        const forwardedFor = request.headers.get("x-forwarded-for");
        const ip = forwardedFor ? forwardedFor.split(",")[0] : "unknown-ip";

        // Create a daily session hash: IP + JobId + Current Date String
        const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        const sessionHash = crypto.createHash("sha256").update(`${ip}-${jobId}-${dateStr}`).digest("hex");

        // Try to get authenticated user if they exist (don't fail if they aren't)
        const { data: { session } } = await supabase.auth.getSession();
        const viewerId = session?.user?.id || null;

        // Check if this exact session hash already recorded a view for this job today
        const { count } = await adminClient
            .from("job_views")
            .select("*", { count: "exact", head: true })
            .eq("job_id", jobId)
            .eq("session_hash", sessionHash);

        if (count && count > 0) {
            return NextResponse.json({ success: true, recorded: false, reason: "already_viewed_today" });
        }

        // Insert new view using admin client (bypasses RLS for anonymous tracking)
        const { error } = await adminClient
            .from("job_views")
            .insert({
                job_id: jobId,
                viewer_id: viewerId,
                session_hash: sessionHash,
            });

        if (error) {
            console.error("[JOB_VIEW_TRACKING] DB Insert Error:", error);
        }

        return NextResponse.json({ success: true, recorded: true });
    } catch (error) {
        console.error("[JOB_VIEW_TRACKING] Unhandled Error:", error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}


export const dynamic = "force-dynamic";
