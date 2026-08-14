import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { emitSystemEvent } from "@/lib/mission-control";
import { getPlugin } from "@/lib/automation/registry";
import { QueueBulkActionSchema } from "@/lib/validations/ingestion";
import { logApiError } from "@/lib/api-error-handler";
import { z } from "zod";

export const dynamic = "force-dynamic";

const BulkRequestSchema = z.object({
    action: QueueBulkActionSchema,
    queueItemIds: z.array(z.string().uuid()),
});

export async function POST(req: Request) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const validation = BulkRequestSchema.safeParse(body);

    if (!validation.success) {
        return NextResponse.json({ error: "Invalid request data", details: validation.error.format() }, { status: 400 });
    }

    const { action, queueItemIds } = validation.data;

    try {
        if (action === "BULK_APPROVE") {
            // Update all to APPROVED
            await supabase
                .from("ingested_jobs_queue")
                .update({ status: "APPROVED", reviewed_at: new Date().toISOString() })
                .in("id", queueItemIds);

            // Trigger publisher for each
            const plugin = getPlugin("job-ingestion-publisher");
            if (plugin) {
                for (const queueItemId of queueItemIds) {
                    plugin.run({ queueItemId }).catch(console.error);
                }
            }

            await emitSystemEvent({
                category: "INGESTION",
                severity: "INFO",
                event: "INGESTED_JOBS_BULK_APPROVED",
                message: `Admin approved ${queueItemIds.length} ingested jobs`,
                metadata: { queueItemIds }
            });

            return NextResponse.json({ success: true, message: `Approved ${queueItemIds.length} jobs.` });
        }

        if (action === "BULK_DELETE") {
            await supabase
                .from("ingested_jobs_queue")
                .delete()
                .in("id", queueItemIds);

            await emitSystemEvent({
                category: "INGESTION",
                severity: "WARNING",
                event: "INGESTED_JOBS_BULK_DELETED",
                message: `Admin deleted ${queueItemIds.length} ingested jobs`,
                metadata: { queueItemIds }
            });

            return NextResponse.json({ success: true, message: `Deleted ${queueItemIds.length} jobs.` });
        }

        return NextResponse.json({ error: "Invalid bulk action" }, { status: 400 });

    } catch (err: any) {
        return logApiError(err, { action, metadata: { queueItemIds } });
    }
}
