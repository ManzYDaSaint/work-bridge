import { createSupabaseServerClient } from "@/lib/supabase-server";
import { withAuth } from "@/lib/auth-guard";
import { NextResponse } from "next/server";

export const POST = withAuth(async (request, auth) => {
    const supabase = await createSupabaseServerClient();
    const userId = auth.userId;

    try {
        const { applicationId } = await request.json();

        const { data: applicationInfo, error: appInfoError } = await supabase
            .from("applications")
            .select("id, status, job:jobs(employer_id), viewed_at")
            .eq("id", applicationId)
            .single();

        if (appInfoError || !applicationInfo) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        if ((applicationInfo.job as any)?.employer_id !== userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Only update if not already viewed
        if (!applicationInfo.viewed_at) {
            const { error: updateError } = await supabase
                .from("applications")
                .update({ viewed_at: new Date().toISOString() })
                .eq("id", applicationId);

            if (updateError) {
                return NextResponse.json({ error: "Failed to update viewed status" }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("View application error:", error);
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
}, ["EMPLOYER"], false, true);
