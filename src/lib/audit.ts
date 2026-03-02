import { createSupabaseServerClient } from "./supabase-server";
import { sendAdminSecurityAlert } from "./resend";

/**
 * WorkBridge Auditing System
 * -------------------------
 * 1. DATABASE AUTOMATED: INSERT, UPDATE, DELETE on high-risk tables (users, jobs, etc.)
 *    are handled by 'audit_trigger_function' in Postgres.
 * 2. MANUAL EVENTS: Auth attempts, data exports, AI anonymization, and other non-CRUD
 *    events should use this recordAuditLog function.
 */

const HIGH_RISK_EVENTS = [
    'auth_FAIL',
    'transactions_FAILED',
    'users_DELETE',
    'data_EXPORT'
];

export async function recordAuditLog(payload: {
    action: string;
    path: string;
    method: string;
    statusCode: number;
    userId?: string;
    metadata?: any;
}) {
    try {
        const supabase = await createSupabaseServerClient();

        const auditData: any = {
            action: payload.action,
            path: payload.path,
            method: payload.method,
            status_code: payload.statusCode,
            user_id: payload.userId,
            metadata: payload.metadata || {},
            ip: 'server_side'
        };

        const { error } = await supabase.from("audit_logs").insert(auditData);

        if (error) {
            console.warn("[Audit] Log insertion failed:", error.message);
        }

        // Trigger Security Alerts for High-Risk Events
        if (HIGH_RISK_EVENTS.includes(payload.action) || payload.statusCode >= 500) {
            await sendAdminSecurityAlert({
                event: payload.action,
                details: `High-risk event detected at ${payload.path}. Status: ${payload.statusCode}`,
                metadata: payload.metadata
            });
        }
    } catch (err) {
        console.error("[Audit] Critical failure in audit logger:", err);
    }
}
