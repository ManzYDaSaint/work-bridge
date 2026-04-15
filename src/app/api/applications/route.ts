import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
    const auth = await validateAuth(["JOB_SEEKER"]);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    // Step 1: Fetch applications for this seeker
    const { data: appsData, error: appsError } = await supabase
        .from("applications")
        .select("id, job_id, user_id, status, created_at")
        .eq("user_id", auth.userId)
        .order("created_at", { ascending: false });

    if (appsError) {
        console.error("Applications GET error:", appsError);
        return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
    }

    if (!appsData || appsData.length === 0) return NextResponse.json([]);

    const jobIds = appsData.map((a: any) => a.job_id);

    // Step 2: Fetch full job data
    const { data: jobsData } = await supabase
        .from("jobs")
        .select("*")
        .in("id", jobIds);

    const jobs = jobsData || [];

    // Step 3: Fetch application counts per job
    const { data: appCounts } = await supabase
        .from("applications")
        .select("job_id")
        .in("job_id", jobIds);

    const countMap: Record<string, number> = {};
    (appCounts || []).forEach((a: any) => {
        countMap[a.job_id] = (countMap[a.job_id] || 0) + 1;
    });

    // Step 4: Fetch employer info separately (avoids RLS join issues)
    const employerIds = [...new Set(jobs.map((j: any) => j.employer_id).filter(Boolean))];
    const employerMap: Record<string, any> = {};

    if (employerIds.length > 0) {
        const { data: employersData } = await supabase
            .from("employers")
            .select("id, company_name, logo_url, industry, website, description, location")
            .in("id", employerIds);

        (employersData || []).forEach((emp: any) => {
            employerMap[emp.id] = {
                id: emp.id,
                companyName: emp.company_name,
                logoUrl: emp.logo_url ?? null,
                industry: emp.industry ?? null,
                website: emp.website ?? null,
                description: emp.description ?? null,
                location: emp.location ?? null,
            };
        });
    }

    // Step 5: Build job map
    const jobMap: Record<string, any> = {};
    jobs.forEach((job: any) => {
        jobMap[job.id] = {
            ...job,
            createdAt: job.created_at,
            employer: employerMap[job.employer_id] ?? null,
            _count: { applications: countMap[job.id] || 0 },
        };
    });

    // Step 6: Map applications with full job data
    const formattedData = appsData.map((app: any) => ({
        id: app.id,
        jobId: app.job_id,
        userId: app.user_id,
        status: app.status,
        createdAt: app.created_at,
        job: jobMap[app.job_id] ?? null,
    }));

    const response = NextResponse.json(formattedData);
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
}
