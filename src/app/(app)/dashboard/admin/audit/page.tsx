import { adminService } from "@/services/adminService";
import { validateAuth } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import AdminAuditClient from "./AdminAuditClient";

export default async function AdminAuditPage({
    searchParams,
}: {
    searchParams: Promise<{ offset?: string; userId?: string; action?: string; path?: string }>;
}) {
    const auth = await validateAuth(["ADMIN"], false);
    if (auth.error || !auth.user) {
        redirect("/login");
    }

    const params = await searchParams;
    const offset = parseInt(params.offset || "0");
    const userId = params.userId || "";
    const action = params.action || "";
    const path = params.path || "";
    const limit = 50;

    let items: any[] = [];
    let total = 0;

    try {
        const result = await adminService.getAuditLogs({ limit, offset, userId, action, path });
        items = result.items.map((item: any) => ({
            id: item.id,
            action: item.action,
            path: item.path,
            method: item.method,
            statusCode: item.status_code,
            createdAt: item.created_at,
            userId: item.user_id,
            user: item.user
        }));
        total = result.total;
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
            initialLogs={items} 
            initialMeta={{ 
                total, 
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
