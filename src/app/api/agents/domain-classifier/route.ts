/**
 * POST /api/agents/domain-classifier
 *
 * Admin-only endpoint to manually trigger the Domain Classifier Agent
 * on a specific Job or Seeker record, or run a bulk backfill pass.
 *
 * Body options:
 *   { target: "JOB",    recordId: "<uuid>" }           → classify one job
 *   { target: "SEEKER", recordId: "<uuid>" }           → classify one seeker
 *   { target: "BACKFILL", limit?: number }             → classify unclassified records (both)
 */
import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { classifyDomainForRecord } from "@/lib/agents/domain-classifier-agent";
import { emitSystemEvent } from "@/lib/mission-control";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
    const auth = await validateAuth(["ADMIN"], false);
    if (auth.error) return auth.error;

    try {
        const body = await request.json();
        const { target, recordId, limit = 20 } = body;

        // ── Single record classification ──────────────────────────────────────
        if (target === "JOB" && recordId) {
            const supabase = getSupabaseAdminClient();
            if (!supabase) return NextResponse.json({ error: "Admin client unavailable" }, { status: 500 });

            const { data: job } = await supabase
                .from("jobs")
                .select("id, title, qualification, domain_id")
                .eq("id", recordId)
                .single();

            if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

            const result = await classifyDomainForRecord({
                target: "JOB",
                recordId: job.id,
                qualification: job.qualification ?? null,
                title: job.title,
                currentDomainId: job.domain_id ?? null,
            });

            return NextResponse.json({ success: true, result });
        }

        if (target === "SEEKER" && recordId) {
            const supabase = getSupabaseAdminClient();
            if (!supabase) return NextResponse.json({ error: "Admin client unavailable" }, { status: 500 });

            const { data: seeker } = await supabase
                .from("job_seekers")
                .select("id, qualification, education, domain_id")
                .eq("id", recordId)
                .single();

            if (!seeker) return NextResponse.json({ error: "Seeker not found" }, { status: 404 });

            const result = await classifyDomainForRecord({
                target: "SEEKER",
                recordId: seeker.id,
                qualification: seeker.qualification ?? null,
                education: seeker.education ?? null,
                currentDomainId: seeker.domain_id ?? null,
            });

            return NextResponse.json({ success: true, result });
        }

        // ── Bulk backfill ─────────────────────────────────────────────────────
        if (target === "BACKFILL") {
            const supabase = getSupabaseAdminClient();
            if (!supabase) return NextResponse.json({ error: "Admin client unavailable" }, { status: 500 });

            const batchLimit = Math.min(Number(limit) || 20, 50); // hard cap at 50
            const results: any[] = [];

            // Unclassified jobs (ACTIVE, domain_id IS NULL, has qualification)
            const { data: unclassifiedJobs } = await supabase
                .from("jobs")
                .select("id, title, qualification")
                .eq("status", "ACTIVE")
                .is("domain_id", null)
                .not("qualification", "is", null)
                .order("created_at", { ascending: false })
                .limit(Math.floor(batchLimit / 2));

            for (const job of unclassifiedJobs ?? []) {
                const result = await classifyDomainForRecord({
                    target: "JOB",
                    recordId: job.id,
                    qualification: job.qualification ?? null,
                    title: job.title,
                    currentDomainId: null,
                });
                results.push({ type: "JOB", id: job.id, ...result });
            }

            // Unclassified seekers (domain_id IS NULL)
            const { data: unclassifiedSeekers } = await supabase
                .from("job_seekers")
                .select("id, qualification, education")
                .is("domain_id", null)
                .order("created_at", { ascending: false })
                .limit(Math.ceil(batchLimit / 2));

            for (const seeker of unclassifiedSeekers ?? []) {
                const result = await classifyDomainForRecord({
                    target: "SEEKER",
                    recordId: seeker.id,
                    qualification: seeker.qualification ?? null,
                    education: seeker.education ?? null,
                    currentDomainId: null,
                });
                results.push({ type: "SEEKER", id: seeker.id, ...result });
            }

            const classified = results.filter((r) => r.domainId !== null).length;
            const skipped    = results.filter((r) => r.skipped).length;
            const failed     = results.filter((r) => r.error && !r.skipped).length;

            await emitSystemEvent({
                category: "SYSTEM",
                severity: "SUCCESS",
                event: "DOMAIN_BACKFILL_COMPLETED",
                message: `[DomainAgent] Backfill: ${classified} classified, ${skipped} skipped, ${failed} failed out of ${results.length} records`,
                metadata: { classified, skipped, failed, total: results.length },
            });

            return NextResponse.json({
                success: true,
                total: results.length,
                classified,
                skipped,
                failed,
                results,
            });
        }

        return NextResponse.json(
            { error: "Invalid target. Use 'JOB', 'SEEKER', or 'BACKFILL'." },
            { status: 400 }
        );
    } catch (err: any) {
        console.error("[DomainClassifier API] Error:", err);
        return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
    }
}
