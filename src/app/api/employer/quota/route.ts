import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/employer/quota
 * Returns the employer's current usage across all quota dimensions.
 * Used by the QuotaStatusBar component in the employer sidebar.
 */
export async function GET() {
    const auth = await validateAuth(["EMPLOYER", "ADMIN"], false, true);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    // Parallel fetch all quota data
    const [
        { data: quotaData },
        { count: activeJobCount },
        { count: savedCount },
    ] = await Promise.all([
        supabase
            .from("user_quotas")
            .select("discovery_count")
            .eq("user_id", auth.userId)
            .maybeSingle(),
        supabase
            .from("jobs")
            .select("id", { count: "exact", head: true })
            .eq("employer_id", auth.userId)
            .eq("status", "ACTIVE"),
        supabase
            .from("employer_saved_candidates")
            .select("id", { count: "exact", head: true })
            .eq("employer_id", auth.userId),
    ]);

    return NextResponse.json({
        discovery: {
            used: quotaData?.discovery_count ?? 0,
            limit: 30,
        },
        activeJobs: {
            used: activeJobCount ?? 0,
            limit: 2,
        },
        savedCandidates: {
            used: savedCount ?? 0,
            limit: 25,
        },
    });
}
