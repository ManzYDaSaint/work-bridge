import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
    const auth = await validateAuth(['ADMIN'], true);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const results = await Promise.all([
            supabase.from("users").select("*", { count: "exact", head: true }),
            supabase.from("job_seekers").select("*", { count: "exact", head: true }),
            supabase.from("employers").select("*", { count: "exact", head: true }),
            supabase.from("jobs").select("*", { count: "exact", head: true }),
            supabase.from("applications").select("*", { count: "exact", head: true }),
        ]);

        const stats = results.map(r => r.count || 0);

        return NextResponse.json({
            stats: {
                totalUsers: stats[0],
                totalSeekers: stats[1],
                totalEmployers: stats[2],
                totalJobs: stats[3],
                totalApplications: stats[4]
            }
        });
    } catch (error) {
        console.error("Admin stats fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
