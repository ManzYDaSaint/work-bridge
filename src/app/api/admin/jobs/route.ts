import { validateAuth } from "@/lib/auth-guard";
import { adminService } from "@/services/adminService";
import { jobService } from "@/services/jobService";
import { withAudit } from "@/lib/api-utils";
import { NextResponse } from "next/server";

const ALLOWED_JOB_STATUSES = new Set(["ACTIVE", "PENDING", "EXPIRED", "FILLED", "ARCHIVED"]);

export const GET = withAudit(async (request: Request) => {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");
        const search = searchParams.get("search") || "";
        const status = searchParams.get("status") || "ALL";

        const { jobs, total } = await adminService.getSystemJobs({
            page,
            limit,
            search,
            status
        });

        // Camelize response and handle auto-approval logic
        const formattedJobs = jobs.map(j => {
            const employer = j.employer;
            const employerStatus = employer?.status;

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

        return NextResponse.json({
            jobs: formattedJobs,
            total,
            page,
            limit
        });
    } catch (error) {
        console.error("Admin jobs fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
    }
}, "ADMIN_FETCH_JOBS");

export const PATCH = withAudit(async (request: Request) => {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    try {
        const { jobId, status } = await request.json();

        if (typeof jobId !== "string" || !jobId) {
            return NextResponse.json({ error: "Valid jobId is required" }, { status: 400 });
        }

        if (!ALLOWED_JOB_STATUSES.has(status)) {
            return NextResponse.json({ error: "Invalid job status" }, { status: 400 });
        }

        await jobService.updateJob(jobId, { status });

        return NextResponse.json({ success: true, metadata: { jobId, status } });
    } catch (error) {
        console.error("Admin job update error:", error);
        return NextResponse.json({ error: "Update failed", details: (error as any)?.message }, { status: 500 });
    }
}, "ADMIN_JOB_MODERATION");

export const DELETE = withAudit(async (request: Request) => {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    try {
        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('jobId');

        if (!jobId) {
            return NextResponse.json({ error: "Job ID required" }, { status: 400 });
        }

        await jobService.deleteJob(jobId);

        return NextResponse.json({ success: true, metadata: { jobId } });
    } catch (error) {
        console.error("Admin job delete error:", error);
        return NextResponse.json({ error: "Delete failed", details: (error as any)?.message }, { status: 500 });
    }
}, "ADMIN_JOB_DELETION");
