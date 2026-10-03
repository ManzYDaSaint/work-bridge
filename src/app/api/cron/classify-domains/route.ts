/**
 * GET /api/cron/classify-domains
 *
 * Scheduled backfill cron — classifies unclassified Jobs and Seekers
 * that the fire-and-forget agent missed (e.g. imported jobs, old records).
 *
 * Processes up to 30 records per run (15 jobs + 15 seekers).
 * Safe to run frequently — skips already-classified records.
 */
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { classifyDomainForRecord } from "@/lib/agents/domain-classifier-agent";
import { emitSystemEvent } from "@/lib/mission-control";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
        return new NextResponse("Admin client not initialized", { status: 500 });
    }

    try {
        await emitSystemEvent({
            category: "SYSTEM",
            severity: "INFO",
            event: "DOMAIN_CLASSIFY_CRON_STARTED",
            message: "[DomainAgent] Scheduled domain classification cron started",
            metadata: {},
        });

        const results: Array<{ type: string; id: string; domainName: string | null; error?: string }> = [];

        // ── Unclassified active jobs ────────────────────────────────────────
        const { data: jobs } = await supabase
            .from("jobs")
            .select("id, title, qualification")
            .eq("status", "ACTIVE")
            .is("domain_id", null)
            .order("created_at", { ascending: false })
            .limit(15);

        for (const job of jobs ?? []) {
            const result = await classifyDomainForRecord({
                target: "JOB",
                recordId: job.id,
                qualification: job.qualification ?? null,
                title: job.title,
                currentDomainId: null,
            });
            results.push({
                type: "JOB",
                id: job.id,
                domainName: result.domainName,
                error: result.error,
            });
        }

        // ── Unclassified seekers ────────────────────────────────────────────
        const { data: seekers } = await supabase
            .from("job_seekers")
            .select("id, qualification, education")
            .is("domain_id", null)
            .order("created_at", { ascending: false })
            .limit(15);

        for (const seeker of seekers ?? []) {
            const result = await classifyDomainForRecord({
                target: "SEEKER",
                recordId: seeker.id,
                qualification: seeker.qualification ?? null,
                education: seeker.education ?? null,
                currentDomainId: null,
            });
            results.push({
                type: "SEEKER",
                id: seeker.id,
                domainName: result.domainName,
                error: result.error,
            });
        }

        const classified = results.filter((r) => r.domainName !== null).length;
        const failed     = results.filter((r) => r.error).length;

        await emitSystemEvent({
            category: "SYSTEM",
            severity: "SUCCESS",
            event: "DOMAIN_CLASSIFY_CRON_COMPLETED",
            message: `[DomainAgent] Cron: ${classified}/${results.length} records classified`,
            metadata: { classified, failed, total: results.length },
        });

        return NextResponse.json({
            success: true,
            total: results.length,
            classified,
            failed,
        });
    } catch (err: any) {
        console.error("[DomainAgent/Cron] Error:", err);
        await emitSystemEvent({
            category: "SYSTEM",
            severity: "WARNING",
            event: "DOMAIN_CLASSIFY_CRON_FAILED",
            message: `[DomainAgent] Cron failed: ${err?.message}`,
            metadata: { error: err?.message },
        });
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
