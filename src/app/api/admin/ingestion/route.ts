import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "PENDING_REVIEW";

    // 1. Fetch queued items
    const { data: queueItems, error: queueErr } = await supabase
        .from("ingested_jobs_queue")
        .select(`
            *,
            source:job_ingestion_sources(id, name, connector_type, reputation_score)
        `)
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(50);

    if (queueErr) {
        return NextResponse.json({ error: queueErr.message }, { status: 500 });
    }

    // 2. Fetch metrics
    const { count: pendingCount } = await supabase
        .from("ingested_jobs_queue")
        .select("id", { count: "exact", head: true })
        .eq("status", "PENDING_REVIEW");

    const { count: publishedCount } = await supabase
        .from("ingested_jobs_queue")
        .select("id", { count: "exact", head: true })
        .eq("status", "PUBLISHED");

    const { count: sourcesCount } = await supabase
        .from("job_ingestion_sources")
        .select("id", { count: "exact", head: true })
        .eq("is_enabled", true);

    const { data: sources } = await supabase
        .from("job_ingestion_sources")
        .select("*")
        .order("reputation_score", { ascending: false });

    // 3. Fetch system settings
    const { data: settingsRows } = await supabase
        .from("system_settings")
        .select("*");

    const settings: Record<string, boolean> = {
        ingestion_service_enabled: true,
        ingestion_require_admin_approval: true,
    };

    if (settingsRows) {
        settingsRows.forEach((s) => {
            settings[s.key] = s.value === true || s.value === "true";
        });
    }

    return NextResponse.json({
        queueItems: queueItems || [],
        sources: sources || [],
        settings,
        metrics: {
            pendingCount: pendingCount || 0,
            publishedCount: publishedCount || 0,
            sourcesCount: sourcesCount || 0,
        }
    });
}

export async function POST(req: Request) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const { action, queueItemId, sourceId, updatedFields, rejectionReason, settingKey, settingValue } = body;

        if (action === "TOGGLE_SETTING") {
            if (!settingKey) return NextResponse.json({ error: "Missing settingKey" }, { status: 400 });

            await supabase
                .from("system_settings")
                .upsert({
                    key: settingKey,
                    value: settingValue ? "true" : "false",
                    updated_at: new Date().toISOString()
                });

            return NextResponse.json({ success: true, message: `Setting ${settingKey} updated.` });
        }

        if (action === "APPROVE") {
            // Trigger publisher task
            await supabase.from("automation_tasks").insert({
                plugin_id: "job-ingestion-publisher",
                payload: { queueItemId },
                priority: "HIGH"
            });

            await supabase
                .from("ingested_jobs_queue")
                .update({ status: "APPROVED", reviewed_at: new Date().toISOString() })
                .eq("id", queueItemId);

            return NextResponse.json({ success: true, message: "Job approved and publishing task queued." });
        }

        if (action === "REJECT") {
            await supabase
                .from("ingested_jobs_queue")
                .update({
                    status: "REJECTED",
                    rejection_reason: rejectionReason || "Rejected by Admin",
                    reviewed_at: new Date().toISOString()
                })
                .eq("id", queueItemId);

            return NextResponse.json({ success: true, message: "Job rejected." });
        }

        if (action === "UPDATE_AND_APPROVE") {
            // Log human feedback for learning loop if edits were made
            if (updatedFields) {
                const { data: existing } = await supabase
                    .from("ingested_jobs_queue")
                    .select("*")
                    .eq("id", queueItemId)
                    .single();

                if (existing) {
                    const feedbackRows = [];
                    for (const [key, val] of Object.entries(updatedFields)) {
                        if (JSON.stringify((existing as any)[key]) !== JSON.stringify(val)) {
                            feedbackRows.push({
                                queue_item_id: queueItemId,
                                source_id: existing.source_id,
                                field_name: key,
                                original_value: (existing as any)[key],
                                corrected_value: val,
                                confidence_at_extraction: existing.overall_confidence,
                                extraction_method: existing.extraction_method
                            });
                        }
                    }

                    if (feedbackRows.length > 0) {
                        await supabase.from("ingested_human_feedback").insert(feedbackRows);
                    }
                }

                // Update queue item fields
                await supabase
                    .from("ingested_jobs_queue")
                    .update({
                        ...updatedFields,
                        status: "APPROVED",
                        reviewed_at: new Date().toISOString()
                    })
                    .eq("id", queueItemId);
            }

            // Trigger publisher worker
            await supabase.from("automation_tasks").insert({
                plugin_id: "job-ingestion-publisher",
                payload: { queueItemId },
                priority: "HIGH"
            });

            return NextResponse.json({ success: true, message: "Job updated and approved." });
        }

        if (action === "FORCE_CRAWL") {
            // Run crawler synchronously for instant admin feedback
            const { JobIngestionCrawlerWorker } = await import("@/lib/automation/workers/ingestion-crawler-worker");
            await JobIngestionCrawlerWorker.run({ sourceId });

            return NextResponse.json({ success: true, message: "Force crawl completed." });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
