import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function logApiError(
    error: any,
    context: { action: string; metadata?: Record<string, any> }
) {
    console.error(`[API Error] Action: ${context.action}`, error);

    const supabase = getSupabaseAdminClient();
    if (supabase) {
        await supabase.from("ai_health_logs").insert({
            event_type: "API_ERROR",
            status: "FAILED",
            message: error instanceof Error ? error.message : String(error),
            metadata: {
                action: context.action,
                ...context.metadata,
                stack: error instanceof Error ? error.stack : undefined,
            },
        });
    }

    return NextResponse.json(
        { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
    );
}
