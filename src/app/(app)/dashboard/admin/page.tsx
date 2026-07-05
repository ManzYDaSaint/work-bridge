import AdminOverviewClient from "./AdminOverviewClient";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { adminService } from "@/services/adminService";
import { userService } from "@/services/userService";
import { validateAuth } from "@/lib/auth-guard";
import { redirect } from "next/navigation";

export default async function AdminOverviewPage() {
    // Auth check directly in the server component — no internal HTTP round-trip needed.
    const auth = await validateAuth(["ADMIN"], false);
    if (auth.error || !auth.user) {
        redirect("/login");
    }

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
