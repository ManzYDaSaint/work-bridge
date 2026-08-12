import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { emitSystemEvent } from "@/lib/mission-control";
import { processQueue } from "@/lib/automation/engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "ACTIONABLE";

    // 1. Fetch queued items
    let queueQuery = supabase
        .from("ingested_jobs_queue")
        .select(`
            *,
            source:job_ingestion_sources(id, name, connector_type, reputation_score)
        `);

    if (status === "ACTIONABLE") {
        queueQuery = queueQuery.in("status", ["PENDING_REVIEW", "NEEDS_MORE_DATA"]);
    } else {
        queueQuery = queueQuery.eq("status", status);
    }

    const { data: queueItems, error: queueErr } = await queueQuery
        .order("created_at", { ascending: false })
        .limit(50);

    if (queueErr) {
        return NextResponse.json({ error: queueErr.message }, { status: 500 });
    }

    // 2. Fetch metrics
    const { count: pendingCount, error: pendingCountErr } = await supabase
        .from("ingested_jobs_queue")
        .select("id", { count: "exact", head: true })
        .eq("status", "PENDING_REVIEW");
    if (pendingCountErr) {
        return NextResponse.json({ error: pendingCountErr.message }, { status: 500 });
    }

    const { count: publishedCount, error: publishedCountErr } = await supabase
        .from("ingested_jobs_queue")
        .select("id", { count: "exact", head: true })
        .eq("status", "PUBLISHED");
    if (publishedCountErr) {
        return NextResponse.json({ error: publishedCountErr.message }, { status: 500 });
    }

    const { count: needsMoreDataCount, error: needsMoreDataCountErr } = await supabase
        .from("ingested_jobs_queue")
        .select("id", { count: "exact", head: true })
        .eq("status", "NEEDS_MORE_DATA");
    if (needsMoreDataCountErr) {
        return NextResponse.json({ error: needsMoreDataCountErr.message }, { status: 500 });
    }

    const { count: sourcesCount, error: sourcesCountErr } = await supabase
        .from("job_ingestion_sources")
        .select("id", { count: "exact", head: true })
        .eq("is_enabled", true);
    if (sourcesCountErr) {
        return NextResponse.json({ error: sourcesCountErr.message }, { status: 500 });
    }

    const { data: sources, error: sourcesErr } = await supabase
        .from("job_ingestion_sources")
        .select("*")
        .order("reputation_score", { ascending: false });
    if (sourcesErr) {
        return NextResponse.json({ error: sourcesErr.message }, { status: 500 });
    }

    // 3. Fetch system settings
    const { data: settingsRows, error: settingsErr } = await supabase
        .from("system_settings")
        .select("*");
    if (settingsErr) {
        return NextResponse.json({ error: settingsErr.message }, { status: 500 });
    }

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
            needsMoreDataCount: needsMoreDataCount || 0,
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

            await emitSystemEvent({
                category: "SYSTEM",
                severity: "INFO",
                event: "SYSTEM_SETTING_TOGGLED",
                message: `System setting ${settingKey} set to ${settingValue}`,
                metadata: { settingKey, settingValue }
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

            await emitSystemEvent({
                category: "INGESTION",
                severity: "INFO",
                event: "INGESTED_JOB_APPROVED",
                message: `Admin approved ingested job ${queueItemId}`,
                actorId: undefined,
                metadata: { queueItemId }
            });

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

            await emitSystemEvent({
                category: "INGESTION",
                severity: "WARNING",
                event: "INGESTED_JOB_REJECTED",
                message: `Admin rejected ingested job ${queueItemId}`,
                actorId: undefined,
                metadata: { queueItemId, reason: rejectionReason }
            });

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

            await emitSystemEvent({
                category: "INGESTION",
                severity: "INFO",
                event: "INGESTED_JOB_UPDATED_AND_APPROVED",
                message: `Admin updated and approved ingested job ${queueItemId}`,
                actorId: undefined,
                metadata: { queueItemId, updatedFields }
            });

            return NextResponse.json({ success: true, message: "Job updated and approved." });
        }

        if (action === "CREATE_SOURCE") {
            const { name, connector_type, crawl_frequency_minutes, is_enabled } = body;
            if (!name || !connector_type) return NextResponse.json({ error: "Missing name or connector_type" }, { status: 400 });

            const { data: newSource, error: createError } = await supabase
                .from("job_ingestion_sources")
                .insert({
                    name,
                    connector_type,
                    crawl_frequency_minutes: crawl_frequency_minutes || 360,
                    is_enabled: is_enabled ?? true
                })
                .select()
                .single();

            if (createError) return NextResponse.json({ error: createError.message }, { status: 500 });

            await emitSystemEvent({
                category: "INGESTION",
                severity: "INFO",
                event: "INGESTION_SOURCE_CREATED",
                message: `Source ${name} created`,
                metadata: { sourceId: newSource.id }
            });

            return NextResponse.json({ success: true, source: newSource });
        }

        if (action === "DELETE_SOURCE") {
            if (!sourceId) return NextResponse.json({ error: "Missing sourceId" }, { status: 400 });

            const { error: deleteError } = await supabase
                .from("job_ingestion_sources")
                .delete()
                .eq("id", sourceId);

            if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

            await emitSystemEvent({
                category: "INGESTION",
                severity: "WARNING",
                event: "INGESTION_SOURCE_DELETED",
                message: `Source ${sourceId} deleted`,
                metadata: { sourceId }
            });

            return NextResponse.json({ success: true, message: `Source deleted.` });
        }

        if (action === "TOGGLE_SOURCE_STATUS") {
            if (!sourceId) return NextResponse.json({ error: "Missing sourceId" }, { status: 400 });
            // Correctly extract isEnabled from the body
            const isEnabled = body.isEnabled; 

            await supabase
                .from("job_ingestion_sources")
                .update({ is_enabled: isEnabled })
                .eq("id", sourceId);

            await emitSystemEvent({
                category: "INGESTION",
                severity: "INFO",
                event: "INGESTION_SOURCE_TOGGLED",
                message: `Source ${sourceId} set to ${isEnabled ? "enabled" : "disabled"}`,
                metadata: { sourceId, isEnabled }
            });

            return NextResponse.json({ success: true, message: `Source status updated.` });
        }

        if (action === "FORCE_CRAWL") {
            if (!sourceId) {
                return NextResponse.json({ error: "Missing sourceId" }, { status: 400 });
            }

            // Queue crawler task for immediate processing.
            const { data: insertedTask, error: taskError } = await supabase.from("automation_tasks").insert({
                plugin_id: "job-ingestion-crawler",
                payload: { sourceId },
                priority: "HIGH"
            }).select("id").single();

            if (taskError) {
                throw taskError;
            }

            await emitSystemEvent({
                category: "INGESTION",
                severity: "INFO",
                event: "INGESTION_FORCE_CRAWL_QUEUED",
                message: `Admin requested force crawl for source ${sourceId}`,
                actorId: undefined,
                metadata: { sourceId, taskId: insertedTask?.id }
            });

            try {
                await processQueue({ taskId: insertedTask?.id });
            } catch (processError: any) {
                console.error("[FORCE_CRAWL] Immediate automation processing failed:", processError.message);
            }

            return NextResponse.json({ success: true, message: "Force crawl task queued and processing attempted." });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
