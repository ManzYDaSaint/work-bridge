import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Job } from "@/types";
import { cache } from "react";
import { unstable_cache, revalidateTag } from "next/cache";
import { triggerMatchNotifications } from "@/lib/match-notification-service";

export interface JobsPaginationResponse {
    jobs: Job[];
    totalPages: number;
    total: number;
    page: number;
    limit: number;
}

export interface EmployerStats {
    activeJobs: number;
    totalApplicants: number;
    shortlisted: number;
    interviewsSet: number;
}

/**
 * Job Service handles all data access for Job listings across the platform.
 */
export const jobService = {
    /**
     * Calculate summary statistics for an employer's active job pipeline.
     */
    getEmployerStats: cache(async (employerId: string) => {
                const supabase = await createSupabaseServerClient();

                const { data: activeJobRows, error: jobErr } = await supabase
                    .from("jobs")
                    .select("id")
                    .eq("employer_id", employerId)
                    .eq("status", "ACTIVE");

                if (jobErr) {
                    console.error("jobService.getEmployerStats (jobs) error:", jobErr);
                    throw new Error("Failed to fetch active jobs");
                }

                const activeJobIds = (activeJobRows || []).map((j) => j.id);
                const activeJobs = activeJobIds.length;

                if (activeJobs === 0) {
                    return { activeJobs: 0, totalApplicants: 0, shortlisted: 0, interviewsSet: 0 };
                }

                const [allAppsRes, shortlistedRes, interviewingRes] = await Promise.all([
                    supabase.from("applications").select("id", { count: "exact", head: true }).in("job_id", activeJobIds),
                    supabase.from("applications").select("id", { count: "exact", head: true }).in("job_id", activeJobIds).in("status", ["SHORTLISTED", "ACCEPTED"]),
                    supabase.from("applications").select("id", { count: "exact", head: true }).in("job_id", activeJobIds).eq("status", "INTERVIEWING"),
                ]);

                return {
                    activeJobs,
                    totalApplicants: allAppsRes.count || 0,
                    shortlisted: shortlistedRes.count || 0,
                    interviewsSet: interviewingRes.count || 0,
                };
    }),

    /**
     * Fetch active jobs for the public board (Seeker view).
     */
    getJobs: (params: { 
        page?: number; 
        limit?: number; 
        query?: string; 
        workMode?: string; 
        type?: string; 
    }) => 
        unstable_cache(
            async () => {
                // Use a cookie-free client here — unstable_cache cannot access cookies().
                // Public job listings don't require a user session.
                const { createClient } = await import("@supabase/supabase-js");
                const supabase = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                );
                const page = params.page || 1;
                const limit = params.limit || 20;
                const offset = (page - 1) * limit;

                let query = supabase
                    .from("jobs")
                    .select(`
                        *,
                        employer:employers(company_name, id, logo_url, industry, website, location, recruiter_verified)
                    `, { count: 'exact' })
                    .eq("status", "ACTIVE");

                if (params.query) {
                    try {
                        const { generateEmbedding } = await import("@/lib/embedding-service");
                        const qEmbedding = await generateEmbedding(params.query);
                        
                        // Use semantic search RPC
                        const { data: semMatches, error: semErr } = await supabase.rpc('semantic_search_jobs', {
                            query_embedding: qEmbedding,
                            match_count: limit * 5 // get more to allow local pagination
                        });
                        
                        if (!semErr && semMatches && semMatches.length > 0) {
                            const matchedIds = semMatches.map((m: any) => m.id);
                            query = query.in("id", matchedIds);
                        } else {
                            // Fallback to text search if embedding fails or no matches
                            query = query.textSearch('fts_vector', params.query);
                        }
                    } catch (e) {
                        console.warn("Semantic search failed, falling back to text search:", e);
                        query = query.textSearch('fts_vector', params.query);
                    }
                }
                
                if (params.workMode && params.workMode !== "ALL") {
                    query = query.eq("work_mode", params.workMode);
                }
                if (params.type && params.type !== "ALL") {
                    query = query.eq("type", params.type);
                }

                const { data, error, count } = await query
                    .order("created_at", { ascending: false })
                    .range(offset, offset + limit - 1);

                if (error) {
                    console.error("jobService.getJobs error:", error);
                    throw new Error("Failed to fetch jobs");
                }

                const formattedJobs = (data || []).map((job: any) => ({
                    ...job,
                    employer: {
                        id: job.employer?.id,
                        company_name: job.employer?.company_name || "Unknown Company",
                        companyName: job.employer?.company_name || "Unknown Company",
                        logoUrl: job.employer?.logo_url || null,
                        industry: job.employer?.industry,
                        website: job.employer?.website,
                        location: job.employer?.location,
                        recruiterVerified: job.employer?.recruiter_verified,
                    },
                }));

                return {
                    jobs: formattedJobs,
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limit),
                    page,
                    limit
                };
            },
            [`jobs_${params.page || 1}_${params.limit || 20}_${params.query || ""}_${params.workMode || ""}_${params.type || ""}`],
            { tags: ["jobs"] }
        )(),

    /**
     * Fetch jobs owned by a specific employer.
     */
    getEmployerJobs: cache(async (employerId: string, status: string = "all", page: number = 1, limit: number = 8) => {
                const supabase = await createSupabaseServerClient();
                const offset = (page - 1) * limit;

                let query = supabase
                    .from("jobs")
                    .select(`
                        *,
                        employer:employers(company_name, id, description),
                        applications(count)
                    `, { count: 'exact' })
                    .eq("employer_id", employerId);

                if (status && status !== "all") {
                    query = query.eq("status", status);
                }

                const { data, error, count } = await query
                    .order("created_at", { ascending: false })
                    .range(offset, offset + limit - 1);

                if (error) {
                    console.error("jobService.getEmployerJobs error:", error);
                    throw new Error("Failed to fetch jobs");
                }

                const jobIds = (data || []).map((j: any) => j.id);
                let shortlistCounts: Record<string, number> = {};
                if (jobIds.length > 0) {
                    const { data: shortlistedApps } = await supabase
                        .from("applications")
                        .select("job_id")
                        .in("job_id", jobIds)
                        .in("status", ["SHORTLISTED", "ACCEPTED"]);

                    if (shortlistedApps) {
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
                    public_slug: job.public_slug,
                    application_method: job.application_method,
                    external_apply_url: job.external_apply_url,
                    apply_email: job.apply_email,
                    apply_whatsapp: job.apply_whatsapp,
                    apply_phone: job.apply_phone,
                    application_instructions: job.application_instructions,
                    allow_one_tap_apply: job.allow_one_tap_apply,
                    posting_type: job.posting_type,
                    display_company_name: job.display_company_name,
                    job_source: job.job_source,
                    employer: {
                        id: (job.employer as any)?.id,
                        company_name: (job.employer as any)?.company_name || "Unknown Company",
                        companyName: (job.employer as any)?.company_name || "Unknown Company",
                        logoUrl: (job.employer as any)?.logo_url || null,
                    },
                    _count: {
                        applications: job.applications?.[0]?.count ?? 0,
                        shortlisted: shortlistCounts[job.id] || 0,
                    },
                }));

                return {
                    jobs: formattedJobs,
                    total: count || 0,
                    page,
                    limit,
                    totalPages: Math.ceil((count || 0) / limit),
                };
    }),

    /**
     * Fetch applications for an employer with pagination.
     * Avoids loading all applications into memory for high-volume employers.
     */
    getEmployerApplications: cache(async (
        employerId: string,
        jobId?: string,
        page: number = 1,
        limit: number = 50
    ) => {
        const supabase = await createSupabaseServerClient();
        const offset = (page - 1) * limit;

        // First, get owned job IDs (DB-level ownership gate)
        const { data: ownedJobs, error: jobsError } = await supabase
            .from("jobs")
            .select("id")
            .eq("employer_id", employerId);

        if (jobsError) throw new Error("Failed to verify job ownership");

        const ownedJobIds = (ownedJobs || []).map((j) => j.id);
        if (ownedJobIds.length === 0) return { data: [], total: 0, totalPages: 0 };

        const targetJobIds = jobId ? [jobId] : ownedJobIds;

        const { data, error, count } = await supabase
            .from("applications")
            .select(`
                *,
                job:jobs(id, title, must_have_skills, nice_to_have_skills, minimum_years_experience, qualification),
                user:users!applications_user_id_fkey(
                    id,
                    email,
                    jobSeeker:job_seekers(*)
                )
            `, { count: "exact" })
            .in("job_id", targetJobIds)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error("jobService.getEmployerApplications error:", error);
            throw new Error("Failed to fetch applications");
        }

        return {
            data: data || [],
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
        };
    }),

    /**
     * Talent discovery for employers with pagination.
     * Fixes the broken join filter that only returned already-saved candidates,
     * and adds pagination to prevent loading all seekers into memory.
     */
    getDiscoverTalent: cache(async (
        employerId: string,
        filters: {
            intent?: string;
            seniority?: string;
            status?: string;
            location?: string;
            qualification?: string;
            hasResume?: boolean;
            skills?: string;
        },
        page: number = 1,
        limit: number = 24
    ) => {
        const supabase = await createSupabaseServerClient();
        const offset = (page - 1) * limit;

        // Fetch this employer's saved candidate IDs separately to avoid
        // the broken PostgREST join filter that incorrectly filtered OUT unsaved candidates.
        const { data: savedRows } = await supabase
            .from("saved_candidates")
            .select("seeker_id")
            .eq("employer_id", employerId);

        const savedSet = new Set((savedRows || []).map((r) => r.seeker_id));

        // Now query all seekers with proper pagination
        let query = supabase
            .from("job_seekers")
            .select(`
                id, full_name, bio, location, skills, seniority_level,
                employment_status, search_intent, qualification, resume_url,
                avatar_url, created_at, experience, education, employment_type,
                profile_visibility, portfolio_links
            `, { count: "exact" });

        if (filters.intent && filters.intent !== "ALL") query = query.eq("search_intent", filters.intent);
        if (filters.seniority && filters.seniority !== "ALL") query = query.eq("seniority_level", filters.seniority);
        if (filters.status && filters.status !== "ALL") query = query.eq("employment_status", filters.status);
        if (filters.location) query = query.ilike("location", `%${filters.location}%`);
        if (filters.qualification && filters.qualification !== "ALL") query = query.eq("qualification", filters.qualification);
        if (filters.hasResume) query = query.not("resume_url", "is", null);
        if (filters.skills) {
            const skillArray = filters.skills.split(",");
            query = query.contains("skills", skillArray);
        }

        // Fetch extra records in case we need to filter out admins/employers
        const { data, error, count } = await query
            .order("created_at", { ascending: false })
            .range(offset, offset + limit * 2);

        if (error) {
            console.error("jobService.getDiscoverTalent error:", error);
            throw new Error("Failed to fetch talent");
        }

        let validSeekers = data || [];
        
        // Filter out any accounts that aren't actually JOB_SEEKERs (like admins)
        if (validSeekers.length > 0) {
            const { getSupabaseAdminClient } = await import("@/lib/supabase-admin");
            const adminClient = getSupabaseAdminClient();
            if (adminClient) {
                const seekerIds = validSeekers.map(s => s.id);
                const { data: userRoles } = await adminClient
                    .from("users")
                    .select("id, role")
                    .in("id", seekerIds);
                
                if (userRoles) {
                    const validIds = new Set(userRoles.filter(u => u.role === "JOB_SEEKER").map(u => u.id));
                    validSeekers = validSeekers.filter(s => validIds.has(s.id));
                }
            }
        }

        // Slice back to the requested limit
        validSeekers = validSeekers.slice(0, limit);

        return {
            seekers: validSeekers.map((seeker) => ({
                ...seeker,
                is_saved: savedSet.has(seeker.id),
            })),
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
        };
    }),

    /**
     * Create a new job listing.
     */
    createJob: async (employerId: string, jobData: any) => {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase
            .from("jobs")
            .insert({ ...jobData, employer_id: employerId })
            .select()
            .single();

        if (error) throw error;

        // Sync embedding so that AI matching can find it immediately
        try {
            const { syncJobEmbedding } = await import("@/lib/sync-embeddings");
            await syncJobEmbedding(data.id, data);
        } catch (e) {
            console.error("[JOB_SERVICE] Failed to sync embedding during job creation:", e);
        }

        // Fire-and-forget: do NOT await — this runs in the background.
        triggerMatchNotifications(data.id).catch((err) =>
            console.error("[JOB_SERVICE] Background match notification failed:", err)
        );

        (revalidateTag as any)("jobs");
        (revalidateTag as any)(`jobs_${employerId}`);
        (revalidateTag as any)(`employer_stats_${employerId}`);

        return data;
    },

    /**
     * Update an existing job.
     */
    updateJob: async (jobId: string, updates: any) => {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase
            .from("jobs")
            .update(updates)
            .eq("id", jobId)
            .select()
            .single();

        if (error) throw error;
        
        const employerId = data?.employer_id;
        (revalidateTag as any)("jobs");
        if (employerId) {
            (revalidateTag as any)(`jobs_${employerId}`);
            (revalidateTag as any)(`employer_stats_${employerId}`);
        }
        
        return data;
    },

    /**
     * Delete a job.
     */
    deleteJob: async (jobId: string) => {
        const supabase = await createSupabaseServerClient();
        
        // Fetch employer_id before deleting for cache invalidation
        const { data: job } = await supabase.from("jobs").select("employer_id").eq("id", jobId).single();
        const employerId = job?.employer_id;

        const { error } = await supabase.from("jobs").delete().eq("id", jobId);
        if (error) throw error;
        
        (revalidateTag as any)("jobs");
        if (employerId) {
            (revalidateTag as any)(`jobs_${employerId}`);
            (revalidateTag as any)(`employer_stats_${employerId}`);
        }
        
        return { success: true };
    }
};
