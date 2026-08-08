import { getSupabaseAdminClient } from "./supabase-admin";

export type EventCategory = 
    | "USER" 
    | "EMPLOYER" 
    | "JOB" 
    | "APPLICATION" 
    | "MATCHING" 
    | "NOTIFICATION" 
    | "AUTOMATION" 
    | "PAYMENT" 
    | "SYSTEM" 
    | "SECURITY"
    | "OPPORTUNITY_MANAGEMENT"
    | "INGESTION";

export type EventSeverity = "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";

export interface SystemEventPayload {
    category: EventCategory;
    severity?: EventSeverity;
    event: string;
    message: string;
    actorId?: string;
    correlationId?: string;
    metadata?: Record<string, any>;
}

/**
 * Centralized Mission Control Event Service
 * Fire-and-forget logging for all significant platform actions.
 */
export async function emitSystemEvent(payload: SystemEventPayload) {
    try {
        const supabase = getSupabaseAdminClient();
        if (!supabase) {
            console.error("[MISSION_CONTROL] FAILED: Admin client not initialized");
            return;
        }

        const severity = payload.severity || "INFO";
        
        // Log to console for local dev visibility
        const logPrefix = `[MISSION_CONTROL] [${payload.category}] [${severity}]`;
        if (severity === "CRITICAL" || severity === "WARNING") {
            console.warn(`${logPrefix} ${payload.event}: ${payload.message}`, payload.metadata || "");
        } else {
            console.log(`${logPrefix} ${payload.event}: ${payload.message}`);
        }

        const { error } = await supabase
            .from("system_events")
            .insert({
                category: payload.category,
                severity: severity,
                event: payload.event,
                message: payload.message,
                actor_id: payload.actorId,
                correlation_id: payload.correlationId,
                metadata: payload.metadata || {},
            });

        if (error) {
            console.error("[MISSION_CONTROL] DATABASE_ERROR:", error.message);
        }
    } catch (err) {
        console.error("[MISSION_CONTROL] CRITICAL FAILURE:", err);
    }
}
