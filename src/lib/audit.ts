import { sendAdminSecurityAlert } from "./resend";
import { emitSystemEvent } from "./mission-control";

/**
 * Aganyu Auditing System (Now routed to Mission Control)
 * -------------------------
 * 1. DATABASE AUTOMATED: INSERT, UPDATE, DELETE on high-risk tables (users, jobs, etc.)
 *    are handled by 'audit_trigger_function' in Postgres.
 * 2. MANUAL EVENTS: Auth attempts, data exports, profile redaction, and other non-CRUD
 *    events should use this recordAuditLog function, which routes to Mission Control.
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
        const isHighRisk = HIGH_RISK_EVENTS.includes(payload.action) || payload.statusCode >= 500;
        
        await emitSystemEvent({
            category: isHighRisk ? "SECURITY" : "SYSTEM",
            severity: isHighRisk ? "CRITICAL" : (payload.statusCode >= 400 ? "WARNING" : "INFO"),
            event: payload.action,
            message: `Audit log: ${payload.action} on ${payload.path}`,
            actorId: payload.userId,
            metadata: {
                path: payload.path,
                method: payload.method,
                statusCode: payload.statusCode,
                ...payload.metadata
            }
        });

        // Still trigger Security Alerts for High-Risk Events
        if (isHighRisk) {
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
