import { validateAuth } from "@/lib/auth-guard";
import { adminService } from "@/services/adminService";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");
        const userId = searchParams.get("userId") ?? undefined;
        const action = searchParams.get("action") ?? undefined;

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
    }
}
