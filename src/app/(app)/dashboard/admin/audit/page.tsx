import { serverApiFetchJson } from "@/lib/server-api";
import type { AuditLogResponse } from "@/types";
import AdminAuditClient from "./AdminAuditClient";

export default async function AdminAuditPage({
    searchParams,
}: {
    searchParams: Promise<{ offset?: string; userId?: string; action?: string; path?: string }>;
}) {
    const params = await searchParams;
    const offset = parseInt(params.offset || "0");
    const userId = params.userId || "";
    const action = params.action || "";
    const path = params.path || "";
    const limit = 50;

    let data: AuditLogResponse;
    try {
        const searchParamsStr = new URLSearchParams({
            limit: String(limit),
            offset: String(offset),
        });
        if (userId) searchParamsStr.set("userId", userId);
        if (action) searchParamsStr.set("action", action);
        if (path) searchParamsStr.set("path", path);

        data = await serverApiFetchJson<AuditLogResponse>(`/api/admin/audit-logs?${searchParamsStr.toString()}`);
    } catch (error) {
        console.error("Failed to fetch initial audit logs:", error);
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <p className="text-slate-500">Failed to load audit registry. Please refresh the page.</p>
            </div>
        );
    }

    return (
        <AdminAuditClient 
            initialLogs={data.items || []} 
            initialMeta={{ 
                total: data.total || 0, 
                limit, 
                offset 
            }} 
            initialSearchParams={{
                offset: params.offset || "0",
                userId: params.userId || "",
                action: params.action || "",
                path: params.path || "",
            }}
        />
    );
}
