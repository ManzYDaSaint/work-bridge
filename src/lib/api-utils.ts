import { createSupabaseServerClient } from "./supabase-server";
import { recordAuditLog } from "./audit";
import { NextResponse } from "next/server";

type ApiHandler = (request: Request, ...args: any[]) => Promise<NextResponse>;

/**
 * Higher-order function to wrap API handlers with automatic audit logging.
 */
export function withAudit(handler: ApiHandler, actionName?: string) {
    return async (request: Request, ...args: any[]) => {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        const path = new URL(request.url).pathname;
        const method = request.method;
        const action = actionName || `${method}_${path.replace(/\//g, '_').toUpperCase()}`;

        try {
            const response = await handler(request, ...args);

            // Record the audit log asynchronously
            recordAuditLog({
                action,
                path,
                method,
                statusCode: response.status,
                userId: user?.id,
                metadata: {
                    ip: request.headers.get('x-forwarded-for') || 'unknown',
                    userAgent: request.headers.get('user-agent'),
                }
            }).catch(err => console.error("Audit background failure:", err));

            return response;
        } catch (error: any) {
            const statusCode = error.status || 500;

            recordAuditLog({
                action: `${action}_ERROR`,
                path,
                method,
                statusCode,
                userId: user?.id,
                metadata: { error: error.message || String(error) }
            }).catch(err => console.error("Audit error-logging failure:", err));

            return NextResponse.json(
                { error: error.message || "Internal Server Error" },
                { status: statusCode }
            );
        }
    };
}
