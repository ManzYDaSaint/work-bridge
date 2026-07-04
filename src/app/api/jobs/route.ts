import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { buildPublicJobSlug } from "@/lib/public-slugs";
import { syncJobEmbedding } from "@/lib/sync-embeddings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const workMode = searchParams.get("workMode");
    const type = searchParams.get("type");
    const location = searchParams.get("location");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // Step 1: Fetch jobs (without join — RLS on employers blocks relational joins)
    let dbQuery = supabase
        .from("jobs")
        .select("*", { count: "exact" })
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false });

    if (query) {
        dbQuery = dbQuery.or(`title.ilike.%${query}%,location.ilike.%${query}%`);
    }

    if (workMode) {
        dbQuery = dbQuery.eq("work_mode", workMode);
    }

    if (type) {
        dbQuery = dbQuery.eq("type", type);
    }

    if (location) {
        dbQuery = dbQuery.ilike("location", `%${location}%`);
    }

    const { data: jobsData, error, count } = await dbQuery.range(offset, offset + limit - 1);

    if (error) {
        console.error("Jobs GET error:", error);
        return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
    }

    const jobs = jobsData || [];

    // Step 2: Fetch employer info separately using the employer_ids from the jobs
    const employerIds = [...new Set(jobs.map((j: any) => j.employer_id).filter(Boolean))];

    const employerMap: Record<string, { id: string; companyName: string; logoUrl: string | null; industry?: string | null; website?: string | null; description?: string | null; location?: string | null; recruiterVerified?: boolean }> = {};

    if (employerIds.length > 0) {
        const { data: employersData, error: empError } = await supabase
            .from("employers")
            .select("id, company_name, logo_url, industry, website, description, location, recruiter_verified")
            .in("id", employerIds);

        if (empError) {
            console.error("Employers fetch error:", empError);
        } else {
            (employersData || []).forEach((emp: any) => {
                employerMap[emp.id] = {
                    id: emp.id,
                    companyName: emp.company_name,
                    logoUrl: emp.logo_url ?? null,
                    industry: emp.industry ?? null,
                    website: emp.website ?? null,
                    description: emp.description ?? null,
                    location: emp.location ?? null,
                    recruiterVerified: emp.recruiter_verified ?? false,
                };
            });
        }
    }

    // Step 3: Manually join employer into each job
    const mappedJobs = jobs.map((job: any) => ({
        ...job,
        createdAt: job.created_at,
        employer: employerMap[job.employer_id] ?? null,
    }));

    const response = NextResponse.json({
        jobs: mappedJobs,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
    });
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
}

export async function POST(request: Request) {
    const auth = await validateAuth(['EMPLOYER'], false, true);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const body = await request.json();

        // --- Active Job Limit (2 active jobs max) ---
        const { count: activeJobCount } = await supabase
            .from("jobs")
            .select("id", { count: "exact", head: true })
            .eq("employer_id", auth.userId)
            .eq("status", "ACTIVE");

        if ((activeJobCount || 0) >= 2) {
            return NextResponse.json({
                error: "You've reached the 2 active job limit. We're working on higher plans — want early access?"
            }, { status: 403 });
        }

        // --- Duplicate Prevention Logic ---
        const { data: existingJob } = await supabase
            .from("jobs")
            .select("id")
            .eq("employer_id", auth.userId)
            .eq("title", body.title)
            .eq("location", body.location)
            .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .single();

        if (existingJob) {
            return NextResponse.json({
                error: "Duplicate Listing Detected. You've recently deployed an identical opportunity. Please manage the existing listing instead."
            }, { status: 409 });
        }

        const deadlineRaw = body.deadline != null && String(body.deadline).trim() !== "" ? String(body.deadline).trim() : null;
        const deadline =
            deadlineRaw ||
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

        const { data: createdJob, error: insertError } = await supabase
            .from("jobs")
            .insert({
                employer_id: auth.userId,
                title: body.title,
                description: body.description,
                location: body.location,
                type: body.type,
                work_mode: body.workMode || 'REMOTE',
                skills: body.skills || [],
                must_have_skills: body.mustHaveSkills || body.skills || [],
                nice_to_have_skills: body.niceToHaveSkills || [],
                minimum_years_experience: body.minimumYearsExperience || 0,
                qualification: body.qualification || null,
                screening_questions: body.screeningQuestions || [],
                salary_range: body.salaryRange,
                deadline,
                status: 'ACTIVE',
            })
            .select()
            .single();

        if (insertError) throw insertError;

        const publicSlug = buildPublicJobSlug(createdJob.title, createdJob.id);
        const { data, error } = await supabase
            .from("jobs")
            .update({ public_slug: publicSlug })
            .eq("id", createdJob.id)
            .select()
            .single();

        if (error) throw error;

        // Sync semantic embedding for intelligent matchmaking
        await syncJobEmbedding(data.id, data);

        // --- Notification Trigger ---
        // Fire-and-forget AI matchmaking notifications
        try {
            const { triggerMatchNotifications } = await import("@/lib/match-notification-service");
            triggerMatchNotifications(data.id).catch((err) =>
                console.error("Background match notification failed:", err)
            );
        } catch (e) {
            console.error("Failed to trigger match notifications:", e);
        }

        return NextResponse.json({ success: true, job: data });
    } catch (error: any) {
        console.error("Job POST error:", error);
        return NextResponse.json({ error: error.message || "Failed to post job" }, { status: 500 });
    }
}
