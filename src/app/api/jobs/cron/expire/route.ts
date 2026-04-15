import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

/**
 * CRON JOB: Expire Jobs
 * This endpoint should be called regularly (e.g., hourly) to transition jobs
 * from ACTIVE to EXPIRED if their deadline has passed.
 */
export async function GET(request: Request) {
    // Basic verification: Check for a secret key in the headers
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();

    try {
        const now = new Date().toISOString();

        const { data, error } = await supabase
            .from("jobs")
            .update({ status: 'EXPIRED' })
            .eq("status", 'ACTIVE')
            .lt("deadline", now)
            .select("id");

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: `Transitioned ${data?.length || 0} jobs to EXPIRED status.`,
            expiredIds: data?.map(j => j.id)
        });
    } catch (error: any) {
        console.error("Cron Expire Jobs Error:", error);
        return NextResponse.json({ error: "Failed to expire jobs" }, { status: 500 });
    }
}
