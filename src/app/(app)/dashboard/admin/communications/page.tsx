import { redirect } from "next/navigation";
import { validateAuth } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import CommunicationsClient from "./CommunicationsClient";

export const dynamic = "force-dynamic";

export default async function CommunicationsPage() {
    const auth = await validateAuth(["ADMIN"], false);
    if (auth.error || !auth.user) {
        redirect("/login");
    }

    const supabase = getSupabaseAdminClient();

    const counts = {
        ALL: 0,
        SEEKERS: 0,
        EMPLOYERS: 0,
        PREMIUM_SEEKERS: 0,
    };

    if (supabase) {
        const [{ count: allCount }, { count: seekerCount }, { count: employerCount }, { count: premiumCount }, { count: subscribedCount }] = await Promise.all([
            supabase.from("users").select("id", { count: "exact", head: true }),
            supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "JOB_SEEKER"),
            supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "EMPLOYER"),
            supabase.from("premium_subscriptions").select("seeker_id", { count: "exact", head: true }).eq("status", "ACTIVE").gt("ends_at", new Date().toISOString()),
            supabase.from("job_seekers").select("id", { count: "exact", head: true }).eq("is_subscribed", true),
        ]);

        counts.ALL = allCount ?? 0;
        counts.SEEKERS = seekerCount ?? 0;
        counts.EMPLOYERS = employerCount ?? 0;
        counts.PREMIUM_SEEKERS = Math.max(premiumCount ?? 0, subscribedCount ?? 0);
    }

    return <CommunicationsClient initialCounts={counts} />;
}
