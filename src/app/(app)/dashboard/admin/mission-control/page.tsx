import { redirect } from "next/navigation";
import { validateAuth } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import MissionControlClient from "../notifications/MissionControlClient";

export const dynamic = "force-dynamic";

export default async function MissionControlPage() {
    const auth = await validateAuth(["ADMIN"]);
    if (auth.error) redirect("/login");

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <p className="text-slate-500">Database client unavailable.</p>
            </div>
        );
    }

    const { data: events, error } = await supabase
        .from("system_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

    if (error) {
        console.error("Mission Control page fetch error:", error);
    }

    return <MissionControlClient initialEvents={events || []} />;
}
