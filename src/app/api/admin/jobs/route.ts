import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { withAudit } from "@/lib/api-utils";
import { NextResponse } from "next/server";

export const GET = withAudit(async () => {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();
    try {
        const { data: jobs, error } = await supabase
            .from("jobs")
            .select(`
                *,
                employer:employers(id, company_name, location, status, logo_url, industry, website, description, recruiter_verified)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Camelize response and handle auto-approval logic
        const formattedJobs = jobs.map(j => {
            const employer = Array.isArray(j.employer) ? j.employer[0] : j.employer;
            const employerStatus = employer?.status;

            const jobStatus = j.status;

            return {
                ...j,
                createdAt: j.created_at,
                companyName: employer?.company_name,
                employer: {
                    id: employer?.id,
                    companyName: employer?.company_name,
                    location: employer?.location,
                    logoUrl: employer?.logo_url,
                    industry: employer?.industry,
                    website: employer?.website,
                    description: employer?.description,
                    recruiterVerified: employer?.recruiter_verified,
                },
                employerStatus: employerStatus,
            };
        });

        return NextResponse.json(formattedJobs);
    } catch (error) {
        console.error("Admin jobs fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
    }
}, "ADMIN_FETCH_JOBS");

export const PATCH = withAudit(async (request: Request) => {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const { jobId, status } = await request.json();
        const { user } = auth;

        const { error } = await supabase
            .from("jobs")
            .update({ status })
            .eq("id", jobId);

        if (error) throw error;

        return NextResponse.json({ success: true, metadata: { jobId, status } });
    } catch (error) {
        console.error("Admin job update error:", error);
        return NextResponse.json({ error: "Update failed", details: (error as any)?.message }, { status: 500 });
    }
}, "ADMIN_JOB_MODERATION");

export const DELETE = withAudit(async (request: Request) => {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('jobId');

        if (!jobId) {
            return NextResponse.json({ error: "Job ID required" }, { status: 400 });
        }

        const { error } = await supabase
            .from("jobs")
            .delete()
            .eq("id", jobId);

        if (error) throw error;

        return NextResponse.json({ success: true, metadata: { jobId } });
    } catch (error) {
        console.error("Admin job delete error:", error);
        return NextResponse.json({ error: "Delete failed", details: (error as any)?.message }, { status: 500 });
    }
}, "ADMIN_JOB_DELETION");
