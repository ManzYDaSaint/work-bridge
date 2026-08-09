import { validateAuth } from "@/lib/auth-guard";
import { adminService } from "@/services/adminService";
import { NextResponse } from "next/server";
import { emitSystemEvent } from "@/lib/mission-control";

export async function GET(request: Request) {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;
    let limit = 50;
    let offset = 0;
    let userId: string | undefined = undefined;
    let action: string | undefined = undefined;

    try {
        const { searchParams } = new URL(request.url);
        limit = parseInt(searchParams.get("limit") || "50");
        offset = parseInt(searchParams.get("offset") || "0");
        userId = searchParams.get("userId") ?? undefined;
        action = searchParams.get("action") ?? undefined;

        const { items, total } = await adminService.getAuditLogs({
            offset,
            limit,
            userId,
            action
        });

        return NextResponse.json({
            items: items.map((item: any) => ({
                id: item.id,
                action: item.action,
                path: item.path,
                method: item.method,
                statusCode: item.status_code,
                createdAt: item.created_at,
                userId: item.user_id,
                user: item.user
            })),
            total,
            limit,
            offset
        });
    } catch (error) {
        console.error("Admin audit fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
    } finally {
        await emitSystemEvent({
            category: "SECURITY",
            severity: "INFO",
            event: "ADMIN_FETCH_AUDIT_LOGS",
            message: `Admin fetched audit logs`,
            metadata: { limit, offset }
        });
    }
}


export const dynamic = "force-dynamic";
