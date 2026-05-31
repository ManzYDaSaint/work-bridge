import { createSupabaseServerClient } from "@/lib/supabase-server";
import { withAuth } from "@/lib/auth-guard";
import { NextResponse } from "next/server";

export const GET = withAuth(async (request, auth) => {
    const supabase = await createSupabaseServerClient();
    const userId = auth.userId;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    let query = supabase
        .from("jobs")
        .select(`
            *,
            employer:employers(company_name, id, description),
            applications(count)
        `, { count: 'exact' })
        .eq("employer_id", userId);

    if (status && status !== "all") {
        query = query.eq("status", status);
    }

    const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error("My Jobs GET error:", error);
        return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
    }

    const jobIds = (data || []).map((j: any) => j.id);
    let shortlistCounts: Record<string, number> = {};

    if (jobIds.length > 0) {
        const { data: shortlistedApps, error: sfError } = await supabase
            .from("applications")
            .select("job_id")
            .in("job_id", jobIds)
            .in("status", ["SHORTLISTED", "ACCEPTED"]);

        if (!sfError && shortlistedApps) {
            shortlistCounts = shortlistedApps.reduce((acc: Record<string, number>, app: any) => {
                acc[app.job_id] = (acc[app.job_id] || 0) + 1;
                return acc;
            }, {});
        }
    }

    const formattedJobs = (data || []).map((job: any) => ({
        id: job.id,
        title: job.title,
        description: job.description,
        location: job.location,
        type: job.type,
        work_mode: job.work_mode,
        status: job.status,
        deadline: job.deadline,
        skills: job.skills,
        isNew: job.is_new,
        createdAt: job.created_at,
        employer: job.employer ? {
            id: (job.employer as any).id,
            companyName: (job.employer as any).company_name,
            description: (job.employer as any).description,
        } : undefined,
        _count: {
            applications: job.applications?.[0]?.count ?? 0,
            shortlisted: shortlistCounts[job.id] || 0,
        },
    }));

    return NextResponse.json({
        jobs: formattedJobs,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
    });
});
