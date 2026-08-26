import { validateAuth } from "@/lib/auth-guard";
import { adminService } from "@/services/adminService";
import { jobService } from "@/services/jobService";
import { withAudit } from "@/lib/api-utils";
import { NextResponse } from "next/server";
import { emitSystemEvent } from "@/lib/mission-control";

const ALLOWED_JOB_STATUSES = new Set(["ACTIVE", "PENDING", "REJECTED", "EXPIRED", "FILLED", "ARCHIVED"]);

export const GET = withAudit(async (request: Request) => {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;
    let page = 1;
    let limit = 50;
    let search = "";
    let status = "ALL";

    try {
        const { searchParams } = new URL(request.url);
        page = parseInt(searchParams.get("page") || "1");
        limit = parseInt(searchParams.get("limit") || "50");
        search = searchParams.get("search") || "";
        status = searchParams.get("status") || "ALL";

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
                companyName: j.display_company_name || employer?.company_name,
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
    } finally {
        // Emit an informational event for admin fetches
        await emitSystemEvent({
            category: "JOB",
            severity: "INFO",
            event: "ADMIN_FETCH_JOBS",
            message: `Admin fetched jobs page ${page}`,
            metadata: { page, limit, search, status }
        });
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

        if (status === "ACTIVE") {
            const { runJobMatchingOrchestration } = await import("@/lib/notification/orchestrator");
            const { triggerMatchNotifications } = await import("@/lib/match-notification-service");
            
            // Fire instant matching routines asynchronously
            triggerMatchNotifications(jobId).catch((err) =>
                console.error("[Admin Job PATCH] Instant notification error:", err)
            );
            runJobMatchingOrchestration().catch((err) =>
                console.error("[Admin Job PATCH] Orchestration error:", err)
            );
        }

        await emitSystemEvent({
            category: "JOB",
            severity: "SUCCESS",
            event: "ADMIN_JOB_STATUS_UPDATED",
            message: `Job ${jobId} status set to ${status} by admin`,
            metadata: { jobId, status }
        });

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

        await emitSystemEvent({
            category: "JOB",
            severity: "WARNING",
            event: "ADMIN_JOB_DELETED",
            message: `Job ${jobId} deleted by admin`,
            metadata: { jobId }
        });

        return NextResponse.json({ success: true, metadata: { jobId } });
    } catch (error) {
        console.error("Admin job delete error:", error);
        return NextResponse.json({ error: "Delete failed", details: (error as any)?.message }, { status: 500 });
    }
}, "ADMIN_JOB_DELETION");


export const dynamic = "force-dynamic";
