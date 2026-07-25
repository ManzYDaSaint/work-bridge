import { PageHeader } from "@/components/dashboard/ui";
import MissionControlClient from "./MissionControlClient";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireDashboardProfile } from "@/lib/dashboard-auth";

export const dynamic = "force-dynamic";

export default async function AdminMissionControlPage() {
    await requireDashboardProfile("ADMIN");
    const supabase = await createSupabaseServerClient();
    
    // Initial fetch of the last 50 events for SSR
    const { data: initialEvents } = await supabase
        .from("system_events")
        .select(`
            *,
            actor:users(email)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Mission Control" 
                subtitle="Real-time system events, logs, and platform health monitoring." 
            />
            <MissionControlClient initialEvents={initialEvents || []} />
        </div>
    );
}
