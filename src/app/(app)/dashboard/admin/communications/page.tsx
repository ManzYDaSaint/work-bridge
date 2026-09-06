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
        const [{ count: allCount }, { count: seekerCount }, { count: employerCount }, { count: premiumCount }] = await Promise.all([
            supabase.from("users").select("id", { count: "exact", head: true }),
            supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "JOB_SEEKER"),
            supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "EMPLOYER"),
            supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "JOB_SEEKER").eq("plan", "PREMIUM"),
        ]);

        counts.ALL = allCount ?? 0;
        counts.SEEKERS = seekerCount ?? 0;
        counts.EMPLOYERS = employerCount ?? 0;
        counts.PREMIUM_SEEKERS = premiumCount ?? 0;
    }

    return <CommunicationsClient initialCounts={counts} />;
}
