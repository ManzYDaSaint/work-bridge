import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const auth = await validateAuth(['JOB_SEEKER'], false, false);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    // Step 1: Fetch saved job IDs
    const { data: savedData, error: savedError } = await supabase
        .from("saved_jobs")
        .select("id, job_id, created_at")
        .eq("seeker_id", auth.userId)
        .order("created_at", { ascending: false });

    if (savedError) {
        console.error("Saved Jobs GET error:", savedError);
        return NextResponse.json({ error: "Failed to fetch saved jobs" }, { status: 500 });
    }

    if (!savedData || savedData.length === 0) {
        return NextResponse.json([]);
    }

    const jobIds = savedData.map((s: any) => s.job_id);

    // Step 2: Fetch full job data for those job IDs
    // Note: Due to RLS, some jobs might not be returned if they are not 'ACTIVE'
    const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select("*")
        .in("id", jobIds);

    if (jobsError) {
        console.error("Jobs fetch error:", jobsError);
        return NextResponse.json({ error: "Failed to fetch job details" }, { status: 500 });
    }

    const jobs = jobsData || [];

    // Step 3: Fetch application counts per job (optional but nice)
    const { data: appCounts, error: appCountError } = await supabase
        .from("applications")
        .select("job_id")
        .in("job_id", jobIds);

    const countMap: Record<string, number> = {};
    if (!appCountError && appCounts) {
        appCounts.forEach((a: any) => {
            countMap[a.job_id] = (countMap[a.job_id] || 0) + 1;
        });
    }

    // Step 4: Fetch employer info separately (avoids RLS join issues)
    const employerIds = [...new Set(jobs.map((j: any) => j.employer_id).filter(Boolean))];
    const employerMap: Record<string, any> = {};

    if (employerIds.length > 0) {
        const { data: employersData, error: empError } = await supabase
            .from("employers")
            .select("id, company_name, logo_url, industry, website, description, location")
            .in("id", employerIds);

        if (!empError && employersData) {
            employersData.forEach((emp: any) => {
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
    }

    // Step 5: Build a jobId -> job map
    const jobMap: Record<string, any> = {};
    jobs.forEach((job: any) => {
        jobMap[job.id] = {
            ...job,
            createdAt: job.created_at,
            employer: employerMap[job.employer_id] ?? null,
            _count: { applications: countMap[job.id] || 0 },
        };
    });

    // Step 6: Return ALL saved jobs. If job details are missing (e.g. status != ACTIVE), 
    // we still return the entry so the UI knows it was saved and can show "Inactive".
    const formattedData = savedData.map((s: any) => ({
        id: s.id,
        job_id: s.job_id,
        created_at: s.created_at,
        job: jobMap[s.job_id] || null, // Allow null job details
    }));

    const response = NextResponse.json(formattedData);
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
}

export async function POST(request: Request) {
    const auth = await validateAuth(['JOB_SEEKER'], false, false);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const { jobId } = await request.json();

        if (!jobId) {
            return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
        }

        // Toggle logic: Check if already saved
        const { data: existing } = await supabase
            .from("saved_jobs")
            .select("id")
            .eq("seeker_id", auth.userId)
            .eq("job_id", jobId)
            .maybeSingle(); // Use maybeSingle to avoid 406 errors on no match

        if (existing) {
            // Unsave (Remove)
            const { error: deleteError } = await supabase
                .from("saved_jobs")
                .delete()
                .eq("id", existing.id);

            if (deleteError) throw deleteError;
            return NextResponse.json({ saved: false });
        } else {
            // Save (Insert)
            const { error: insertError } = await supabase
                .from("saved_jobs")
                .insert({
                    seeker_id: auth.userId,
                    job_id: jobId
                });

            if (insertError) {
                // Race condition: another request already inserted the row
                if (insertError.code === '23505') {
                    return NextResponse.json({ saved: true });
                }
                throw insertError;
            }
            return NextResponse.json({ saved: true });
        }
    } catch (error: any) {
        console.error("Saved Jobs POST error:", error);
        return NextResponse.json({ error: error.message || "Failed to toggle saved job" }, { status: 500 });
    }
}
