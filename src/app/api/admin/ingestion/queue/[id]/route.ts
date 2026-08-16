import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { emitSystemEvent } from "@/lib/mission-control";
import { JobIngestionPublisherWorker } from "@/lib/automation/workers/ingestion-publisher-worker";
import { IngestionActionSchema } from "@/lib/validations/ingestion";
import { logApiError } from "@/lib/api-error-handler";
import { z } from "zod";

export const dynamic = "force-dynamic";

const RequestSchema = z.object({
    action: IngestionActionSchema,
    updatedFields: z.any().optional(),
    rejectionReason: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await params;
    const queueItemId = resolvedParams.id;
    const body = await req.json();
    const validation = RequestSchema.safeParse(body);

    if (!validation.success) {
        return NextResponse.json({ error: "Invalid request data", details: validation.error.format() }, { status: 400 });
    }

    const { action, updatedFields, rejectionReason } = validation.data;

    try {
        if (action === "APPROVE") {
            await JobIngestionPublisherWorker.run({ queueItemId });

            await emitSystemEvent({
                category: "INGESTION",
                severity: "INFO",
                event: "INGESTED_JOB_APPROVED",
                message: `Admin approved ingested job ${queueItemId}`,
                actorId: undefined,
                metadata: { queueItemId }
            });

            return NextResponse.json({ success: true, message: "Job approved and published." });
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
            if (updatedFields) {
                const { data: existing } = await supabase
                    .from("ingested_jobs_queue")
                    .select("*")
                    .eq("id", queueItemId)
                    .single();

                if (existing) {
                    const validKeys = Object.keys(existing);
                    const filteredUpdatedFields = Object.entries(updatedFields).reduce((acc, [key, val]) => {
                        if (validKeys.includes(key)) {
                            acc[key] = val;
                        }
                        return acc;
                    }, {} as Record<string, any>);

                    const feedbackRows = [];
                    for (const [key, val] of Object.entries(filteredUpdatedFields)) {
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

                    await supabase
                        .from("ingested_jobs_queue")
                        .update({
                            ...filteredUpdatedFields,
                            reviewed_at: new Date().toISOString()
                        })
                        .eq("id", queueItemId);
                }
            }

            await JobIngestionPublisherWorker.run({ queueItemId });

            await emitSystemEvent({
                category: "INGESTION",
                severity: "INFO",
                event: "INGESTED_JOB_UPDATED_AND_APPROVED",
                message: `Admin updated and approved ingested job ${queueItemId}`,
                actorId: undefined,
                metadata: { queueItemId, updatedFields }
            });

            return NextResponse.json({ success: true, message: "Job updated and approved (immediate publishing initiated)." });
        }

        if (action === "DELETE_QUEUE_ITEM") {
            const { error: deleteError } = await supabase
                .from("ingested_jobs_queue")
                .delete()
                .eq("id", queueItemId);

            if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

            await emitSystemEvent({
                category: "INGESTION",
                severity: "WARNING",
                event: "INGESTED_JOB_DELETED",
                message: `Admin deleted ingested job ${queueItemId}`,
                metadata: { queueItemId }
            });

            return NextResponse.json({ success: true, message: `Job item deleted.` });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (err: any) {
        return logApiError(err, { action, metadata: { queueItemId } });
    }
}
