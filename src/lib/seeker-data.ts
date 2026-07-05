import type { SupabaseClient } from "@supabase/supabase-js";
import type { Application, SavedJob } from "@/types";

type EmployerRow = {
    id: string;
    company_name: string;
    logo_url?: string | null;
    industry?: string | null;
    website?: string | null;
    description?: string | null;
    location?: string | null;
};

function buildEmployerMap(employers: EmployerRow[] | null) {
    const employerMap: Record<string, EmployerRow & { companyName: string; logoUrl: string | null }> = {};
    (employers || []).forEach((emp) => {
        employerMap[emp.id] = {
            ...emp,
            companyName: emp.company_name,
            logoUrl: emp.logo_url ?? null,
        };
    });
    return employerMap;
}

async function fetchEmployersForJobs(
    supabase: SupabaseClient,
    jobs: Array<{ employer_id?: string | null }>
) {
    const employerIds = [...new Set(jobs.map((j) => j.employer_id).filter(Boolean))] as string[];
    if (employerIds.length === 0) return {};

    const { data: employersData } = await supabase
        .from("employers")
        .select("id, company_name, logo_url, industry, website, description, location")
        .in("id", employerIds);

    return buildEmployerMap(employersData);
}

function attachEmployersToJobs(
    jobs: Array<Record<string, unknown> & { id: string; employer_id?: string | null; created_at?: string }>,
    employerMap: ReturnType<typeof buildEmployerMap>
) {
    const jobMap: Record<string, Record<string, unknown>> = {};
    jobs.forEach((job) => {
        jobMap[job.id] = {
            ...job,
            createdAt: job.created_at,
            employer: job.employer_id ? employerMap[job.employer_id] ?? null : null,
        };
    });
    return jobMap;
}

export async function fetchSeekerApplications(
    supabase: SupabaseClient,
    userId: string
): Promise<{ data: Application[]; error: Error | null }> {
    const { data: appsData, error: appsError } = await supabase
        .from("applications")
        .select("id, job_id, user_id, status, created_at, viewed_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (appsError) {
        return { data: [], error: new Error(appsError.message) };
    }

    if (!appsData || appsData.length === 0) {
        return { data: [], error: null };
    }

    const jobIds = appsData.map((a) => a.job_id);
    const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select("*")
        .in("id", jobIds);

    if (jobsError) {
        return { data: [], error: new Error(jobsError.message) };
    }

    const jobs = jobsData || [];
    const employerMap = await fetchEmployersForJobs(supabase, jobs);
    const jobMap = attachEmployersToJobs(jobs, employerMap);

    const applications: Application[] = appsData.map((app) => ({
        id: app.id,
        jobId: app.job_id,
        userId: app.user_id,
        status: app.status,
        createdAt: app.created_at,
        viewedAt: app.viewed_at ?? undefined,
        job: (jobMap[app.job_id] ?? null) as unknown as Application["job"],
    }));

    return { data: applications, error: null };
}

export async function fetchSeekerSavedJobs(
    supabase: SupabaseClient,
    userId: string
): Promise<{ data: SavedJob[]; error: Error | null }> {
    const { data: savedData, error: savedError } = await supabase
        .from("saved_jobs")
        .select("id, job_id, seeker_id, created_at")
        .eq("seeker_id", userId)
        .order("created_at", { ascending: false });

    if (savedError) {
        return { data: [], error: new Error(savedError.message) };
    }

    if (!savedData || savedData.length === 0) {
        return { data: [], error: null };
    }

    const jobIds = savedData.map((s) => s.job_id);
    const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select("*")
        .in("id", jobIds);

    if (jobsError) {
        return { data: [], error: new Error(jobsError.message) };
    }

    const jobs = jobsData || [];
    const employerMap = await fetchEmployersForJobs(supabase, jobs);
    const jobMap = attachEmployersToJobs(jobs, employerMap);

    const savedJobs: SavedJob[] = savedData.map((saved) => ({
        id: saved.id,
        job_id: saved.job_id,
        seeker_id: saved.seeker_id,
        created_at: saved.created_at,
        job: (jobMap[saved.job_id] ?? null) as unknown as SavedJob["job"],
    }));

    return { data: savedJobs, error: null };
}

export async function fetchSeekerAppliedJobIds(
    supabase: SupabaseClient,
    userId: string
): Promise<{ data: string[]; error: Error | null }> {
    const { data, error } = await supabase
        .from("applications")
        .select("job_id")
        .eq("user_id", userId);

    if (error) {
        return { data: [], error: new Error(error.message) };
    }

    return { data: (data || []).map((a) => a.job_id), error: null };
}

export async function fetchSeekerSavedJobIds(
    supabase: SupabaseClient,
    userId: string
): Promise<{ data: string[]; error: Error | null }> {
    const { data, error } = await supabase
        .from("saved_jobs")
        .select("job_id")
        .eq("seeker_id", userId);

    if (error) {
        return { data: [], error: new Error(error.message) };
    }

    return { data: (data || []).map((s) => s.job_id), error: null };
}

export async function fetchJobsWithEmployers(
    supabase: SupabaseClient,
    jobIds: string[],
    options?: { status?: string }
): Promise<{ data: Record<string, unknown>[]; error: Error | null }> {
    if (jobIds.length === 0) {
        return { data: [], error: null };
    }

    let query = supabase.from("jobs").select("*").in("id", jobIds);
    if (options?.status) {
        query = query.eq("status", options.status);
    }

    const { data: jobsData, error: jobsError } = await query;
    if (jobsError) {
        return { data: [], error: new Error(jobsError.message) };
    }

    const jobs = jobsData || [];
    const employerMap = await fetchEmployersForJobs(supabase, jobs);
    const jobMap = attachEmployersToJobs(jobs, employerMap);

    return {
        data: jobIds
            .map((id) => jobMap[id])
            .filter(Boolean),
        error: null,
    };
}
