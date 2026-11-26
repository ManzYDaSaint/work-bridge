import { validateAuth } from "@/lib/auth-guard";
import { adminService } from "@/services/adminService";
import { jobService } from "@/services/jobService";
import { withAudit } from "@/lib/api-utils";
import { NextResponse } from "next/server";
import { emitSystemEvent } from "@/lib/mission-control";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

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
            const supabase = getSupabaseAdminClient();

            // Sequence: Domain Classification → Match Dispatch (fire-and-forget from response)
            (async () => {
                // Step 1: Classify job domain so domain_id is ready before matching
                try {
                    const job = supabase ? await supabase
                        .from("jobs")
                        .select("qualification, title, domain_id")
                        .eq("id", jobId)
                        .single()
                        .then(r => r.data) : null;

                    const { classifyDomainForRecord } = await import("@/lib/agents/domain-classifier-agent");
                    await classifyDomainForRecord({
                        target: "JOB",
                        recordId: jobId,
                        qualification: job?.qualification ?? null,
                        title: job?.title ?? "",
                        currentDomainId: job?.domain_id ?? null,
                    });
                } catch (err) {
                    console.error("[Admin Job PATCH] Domain classification failed:", err);
                }

                // Step 2: Full match dispatch (Premium WhatsApp + Free Email) now domain_id is set
                try {
                    const { runMatchDispatchAgent } = await import("@/lib/agents/match-dispatch-agent");
                    await runMatchDispatchAgent({ jobId, forceImmediateEmail: true });
                } catch (err) {
                    console.error("[Admin Job PATCH] Match dispatch agent error:", err);
                }

                // Step 3: Legacy in-app bell notifications + orchestration
                try {
                    const { triggerMatchNotifications } = await import("@/lib/match-notification-service");
                    const { runJobMatchingOrchestration } = await import("@/lib/notification/orchestrator");
                    triggerMatchNotifications(jobId).catch((err) =>
                        console.error("[Admin Job PATCH] Instant notification error:", err)
                    );
                    runJobMatchingOrchestration().catch((err) =>
                        console.error("[Admin Job PATCH] Orchestration error:", err)
                    );
                } catch (err) {
                    console.error("[Admin Job PATCH] Legacy notifications failed:", err);
                }
            })();
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

export const POST = withAudit(async (request: Request) => {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
        return NextResponse.json({ error: "Database client unavailable" }, { status: 500 });
    }

    try {
        const body = await request.json();

        // 1. Resolve jobs@aganyu.com employer ID
        const { getSystemRecruiterEmployerId } = await import("@/lib/employer-utils");
        const assignedEmployerId = await getSystemRecruiterEmployerId();
        if (!assignedEmployerId) {
            return NextResponse.json(
                { error: "No system recruiter (jobs@aganyu.com) or admin employer profile found to assign job to." },
                { status: 400 }
            );
        }

        const deadlineRaw = body.deadline != null && String(body.deadline).trim() !== "" ? String(body.deadline).trim() : null;
        const deadline =
            deadlineRaw ||
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

        // 2. Resolve Domain
        const { getQualificationDomains } = await import("@/lib/matching-helpers");
        const jobQualText = `${body.qualification || ""} ${body.title || ""}`.trim();
        const resolvedJobDomains = getQualificationDomains(jobQualText);
        let domain_id: string | null = null;
        let domain_classified_at: string | null = null;
        let domain_source: string | null = null;

        if (resolvedJobDomains.length > 0) {
            const { data: matchedDomain } = await supabase
                .from("qualification_domains")
                .select("id")
                .ilike("name", resolvedJobDomains[0])
                .maybeSingle();

            if (matchedDomain?.id) {
                domain_id = matchedDomain.id;
                domain_classified_at = new Date().toISOString();
                domain_source = "keyword_match";
            }
        }

        // 3. Insert Job under jobs@aganyu.com employer_id with display settings
        const { data: createdJob, error: insertError } = await supabase
            .from("jobs")
            .insert({
                employer_id: assignedEmployerId,
                title: body.title,
                description: body.description,
                location: body.location || "Remote",
                type: body.type || "FULL_TIME",
                work_mode: body.workMode || "REMOTE",
                skills: body.skills || [],
                must_have_skills: body.mustHaveSkills || body.skills || [],
                nice_to_have_skills: body.niceToHaveSkills || [],
                minimum_years_experience: body.minimumYearsExperience || 0,
                qualification: body.qualification || null,
                screening_questions: body.screeningQuestions || [],
                salary_range: body.salaryRange || null,
                deadline,
                status: "ACTIVE",
                application_method: body.applicationMethod || "external_url",
                external_apply_url: body.externalApplyUrl || null,
                apply_email: body.applyEmail || null,
                apply_whatsapp: body.applyWhatsapp || null,
                apply_phone: body.applyPhone || null,
                application_instructions: body.applicationInstructions || null,
                allow_one_tap_apply: body.allowOneTapApply !== false,
                posting_type: body.postingType || "AGANYU",
                display_company_name: body.displayCompanyName || null,
                job_source: body.jobSource || "Admin Sourced",
                domain_id,
                domain_classified_at,
                domain_source,
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // 4. Generate public slug
        const { buildPublicJobSlug } = await import("@/lib/public-slugs");
        const publicSlug = buildPublicJobSlug(createdJob.title, createdJob.id);
        const { data: finalJob, error: slugError } = await supabase
            .from("jobs")
            .update({ public_slug: publicSlug })
            .eq("id", createdJob.id)
            .select()
            .single();

        if (slugError) throw slugError;

        // 5. Audit & Mission Control (before background pipeline kicks off)
        const matchedDomainName = resolvedJobDomains.length > 0 ? resolvedJobDomains[0] : null;

        await emitSystemEvent({
            category: "JOB",
            severity: "SUCCESS",
            event: "ADMIN_SOURCED_JOB_CREATED",
            message: `Admin created sourced job "${finalJob.title}" assigned to jobs@aganyu.com (${assignedEmployerId})`,
            actorId: auth.user.id,
            metadata: {
                jobId: finalJob.id,
                assignedEmployerId,
                displayCompanyName: finalJob.display_company_name,
                postingType: finalJob.posting_type,
                domainId: finalJob.domain_id,
                domainName: matchedDomainName,
                domainSource: finalJob.domain_source,
            },
        });

        // If domain was resolved synchronously via keyword matching, emit DOMAIN_CLASSIFIED event for visibility
        if (finalJob.domain_id && matchedDomainName) {
            await emitSystemEvent({
                category: "SYSTEM",
                severity: "SUCCESS",
                event: "DOMAIN_CLASSIFIED",
                message: `[DomainClassifier] JOB ${finalJob.id} → domain "${matchedDomainName}" (keyword_match)`,
                metadata: {
                    target: "JOB",
                    recordId: finalJob.id,
                    domainId: finalJob.domain_id,
                    domainName: matchedDomainName,
                    isNewDomain: false,
                    qualificationText: jobQualText,
                    source: "keyword_match",
                },
            });

            // Cache in qualification_mappings so it is recognized across the entire platform and admin dashboard
            if (finalJob.qualification) {
                const { invalidateQualificationMappingsCache } = await import("@/lib/mapping-cache");
                try {
                    await supabase
                        .from("qualification_mappings")
                        .upsert(
                            {
                                raw_qualification: finalJob.qualification.trim(),
                                domain_id: finalJob.domain_id,
                                is_confirmed: true,
                            },
                            { onConflict: "raw_qualification" }
                        );
                    invalidateQualificationMappingsCache();
                } catch (err) {
                    console.warn("[Admin Job POST] Failed to cache qualification mapping:", err);
                }
            }
        }

        // 6. Sequential background pipeline — Domain Classification → Match Dispatch.
        //    Runs after the HTTP response is returned. Embeddings are deferred to cron/manual.
        //
        //    Step 1 → Domain Classifier (Gemini AI, writes domain_id back to jobs row)
        //    Step 2 → Match Dispatch Agent (finds domain-matched seekers, dispatches
        //             Premium via WhatsApp and Free via Email immediately)
        (async () => {
            const jobId = finalJob.id;

            // ── Step 1: Domain Classification ────────────────────────────────────
            // Awaited so domain_id is written to the jobs row before matching runs.
            // Falls back gracefully if Gemini is unavailable.
            try {
                console.log(`[Admin Job POST] Step 1 — Classifying domain for job ${jobId}`);
                const { classifyDomainForRecord } = await import("@/lib/agents/domain-classifier-agent");
                const classifyResult = await classifyDomainForRecord({
                    target: "JOB",
                    recordId: jobId,
                    qualification: finalJob.qualification ?? null,
                    title: finalJob.title,
                    currentDomainId: finalJob.domain_id ?? null,
                });
                console.log(
                    `[Admin Job POST] Step 1 complete — domain: "${classifyResult.domainName ?? "unresolved"}"`,
                    classifyResult.skipped ? "(skipped — already set)" : ""
                );
            } catch (err) {
                console.error("[Admin Job POST] Step 1 — Domain classification failed (non-fatal, continuing):", err);
            }

            // ── Step 2: Match Dispatch ───────────────────────────────────────────
            // Runs only after domain_id is guaranteed to be set on the job row.
            // Premium seekers → WhatsApp queued instantly.
            // Free seekers    → Email sent immediately (forceImmediateEmail: true).
            try {
                console.log(`[Admin Job POST] Step 2 — Running match dispatch for job ${jobId}`);
                const { runMatchDispatchAgent } = await import("@/lib/agents/match-dispatch-agent");
                const dispatchSummary = await runMatchDispatchAgent({
                    jobId,
                    forceImmediateEmail: true,
                });
                console.log(
                    `[Admin Job POST] Step 2 complete — dispatched ${dispatchSummary.premiumDispatched} Premium (WhatsApp),`,
                    `${dispatchSummary.freeDispatched} Free (Email) out of ${dispatchSummary.totalEvaluated} evaluated`
                );
            } catch (err) {
                console.error("[Admin Job POST] Step 2 — Match dispatch failed (non-fatal):", err);
            }
        })();

        return NextResponse.json({ success: true, job: finalJob });
    } catch (error: any) {
        console.error("[Admin Job POST] Error:", error);
        return NextResponse.json({ error: error.message || "Failed to create job" }, { status: 500 });
    }
}, "ADMIN_JOB_CREATION");


export const dynamic = "force-dynamic";
