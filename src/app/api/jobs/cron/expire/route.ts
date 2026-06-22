import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { validateCronRequest } from "@/lib/cron-auth";

/**
 * CRON JOB: Expire Jobs
 * This endpoint should be called regularly (e.g., hourly) to transition jobs
 * from ACTIVE to EXPIRED if their deadline has passed.
 */
export async function GET(request: Request) {
    const cronValidation = validateCronRequest(request);
    if (cronValidation) return cronValidation;

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

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
