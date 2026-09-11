import { validateAuth } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { RecommendationService } from "@/services/recommendation.service";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const seekerId = searchParams.get("seekerId");

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        const supabase = getSupabaseAdminClient();
        if (!supabase) {
            return NextResponse.json({ error: "Database client unavailable" }, { status: 500 });
        }

        // 1. Fetch user base details
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("*, job_seekers(*), employers(*)")
            .eq("id", userId)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const effectiveSeekerId = seekerId || user.job_seekers?.id || (Array.isArray(user.job_seekers) ? user.job_seekers[0]?.id : null);
        const employerId = user.employers?.id || (Array.isArray(user.employers) ? user.employers[0]?.id : null);

        let matches: any[] = [];
        let notifications: any[] = [];
        let applications: any[] = [];
        let postedJobs: any[] = [];

        // 2. Fetch Active Job Recommendations & Applications for Job Seekers
        if (effectiveSeekerId) {
            const [recommendedJobs, appsRes] = await Promise.all([
                RecommendationService.getRecommendedJobs(effectiveSeekerId, { limit: 15 }).catch((err) => {
                    console.warn("[Admin Inspect] Failed to fetch recommended jobs:", err);
                    return [];
                }),

                supabase
                    .from("applications")
                    .select(`
                        id,
                        status,
                        screening_score,
                        created_at,
                        job:jobs(id, title, location, work_mode)
                    `)
                    .eq("user_id", userId)
                    .order("created_at", { ascending: false })
                    .limit(20)
            ]);

            // Map recommended jobs to structured format
            matches = recommendedJobs.map((j) => ({
                id: j.id,
                title: j.title,
                company: j.display_company_name || (j as any).employer?.company_name || "Direct Employer",
                location: j.location,
                workMode: j.work_mode,
                match_score: j.hard_match_score,
                match_reasons: j.hard_match_reasons,
                match_passed: j.hard_match_passed,
                breakdown: j.hard_match_breakdown
            }));

            applications = appsRes.data || [];
        }

        // 3. Fetch posted jobs for Employers
        if (employerId) {
            const { data: jobs } = await supabase
                .from("jobs")
                .select("id, title, location, status, work_mode, created_at")
                .eq("employer_id", employerId)
                .order("created_at", { ascending: false })
                .limit(20);

            postedJobs = jobs || [];
        }

        // 4. Fetch notification / WhatsApp logs if available
        const { data: whatsappLogs } = await supabase
            .from("whatsapp_delivery_logs")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(10);

        notifications = whatsappLogs || [];

        return NextResponse.json({
            user,
            seekerProfile: user.job_seekers || null,
            employerProfile: user.employers || null,
            matches,
            applications,
            postedJobs,
            notifications
        });
    } catch (error) {
        console.error("Admin user inspect error:", error);
        return NextResponse.json({ error: "Failed to inspect user details" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
