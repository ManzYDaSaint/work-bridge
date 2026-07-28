import AdminOverviewClient from "./AdminOverviewClient";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { adminService } from "@/services/adminService";
import { userService } from "@/services/userService";


export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {

    // Fetch all data directly from services using the cookie-based Supabase client.
    const [stats, closeRequestsResult, activity] = await Promise.all([
        adminService.getMarketplaceStats(),
        userService.getAccountClosureRequests({ status: "PENDING", limit: 5 }),
        (async () => {
            const supabase = await createSupabaseServerClient();
            const { data } = await supabase
                .from("audit_logs")
                .select("*, user:users(id, email, role)")
                .order("created_at", { ascending: false })
                .limit(6);
            return data ?? [];
        })(),
    ]);

    return (
        <AdminOverviewClient
            initialStats={stats}
            initialActivity={activity}
            initialCloseRequests={closeRequestsResult.items}
        />
    );
}
