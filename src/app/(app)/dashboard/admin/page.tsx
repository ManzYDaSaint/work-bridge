import { serverApiFetchJson } from "@/lib/server-api";
import AdminOverviewClient from "./AdminOverviewClient";
import { createSupabaseServerClient } from "@/lib/supabase-server";

interface AdminOverviewResponse {
    stats?: Record<string, unknown>;
    items?: unknown[];
    data?: unknown[];
}

export default async function AdminOverviewPage() {
    // Fetch initial data on the server
    const [statsData, closeRequests, activity] = await Promise.all([
        serverApiFetchJson<AdminOverviewResponse>("/api/admin/stats"),
        serverApiFetchJson<AdminOverviewResponse>("/api/admin/close-requests").then((data) => Array.isArray(data.items) ? data.items : Array.isArray(data.data) ? data.data : []),
        (async () => {
            const supabase = await createSupabaseServerClient();
            const { data } = await supabase
                .from("audit_logs")
                .select("*, user:users(id, email, role)")
                .order("created_at", { ascending: false })
                .limit(6);
            return data ?? [];
        })()
    ]);

    // Filter close requests for pending only, just like the original client logic
    const pendingCloseRequests = closeRequests.filter((r: any) => r.status === "PENDING").slice(0, 5);

    return (
        <AdminOverviewClient 
            initialStats={statsData.stats} 
            initialActivity={activity} 
            initialCloseRequests={pendingCloseRequests} 
        />
    );
}
