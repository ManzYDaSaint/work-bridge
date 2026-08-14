import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { emitSystemEvent } from "@/lib/mission-control";
import { logApiError } from "@/lib/api-error-handler";
import { z } from "zod";

export const dynamic = "force-dynamic";

const RequestSchema = z.discriminatedUnion("action", [
    z.object({
        action: z.literal("CREATE_SOURCE"),
        name: z.string().min(1),
        connector_type: z.string().min(1),
        crawl_frequency_minutes: z.number().optional().default(360),
        is_enabled: z.boolean().optional().default(true),
    }),
    z.object({
        action: z.literal("DELETE_SOURCE"),
        sourceId: z.string().uuid(),
    }),
    z.object({
        action: z.literal("TOGGLE_SOURCE_STATUS"),
        sourceId: z.string().uuid(),
        isEnabled: z.boolean(),
    }),
]);

export async function POST(req: Request) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const validation = RequestSchema.safeParse(body);

    if (!validation.success) {
        return NextResponse.json({ error: "Invalid request data", details: validation.error.format() }, { status: 400 });
    }

    const { action } = validation.data;

    try {
        if (action === "CREATE_SOURCE") {
            const { name, connector_type, crawl_frequency_minutes, is_enabled } = validation.data;

            const { data: newSource, error: createError } = await supabase
                .from("job_ingestion_sources")
                .insert({
                    name,
                    connector_type,
                    crawl_frequency_minutes,
                    is_enabled
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
            const { sourceId } = validation.data;

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
            const { sourceId, isEnabled } = validation.data;

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

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (err: any) {
        return logApiError(err, { action });
    }
}
