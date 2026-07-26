import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { getSeekerOpportunityMatches, getPublicOpportunities } from "@/services/opportunityService";
import SeekerOpportunitiesClient from "./SeekerOpportunitiesClient";

export const metadata = {
    title: "My Opportunities — Aganyu",
};

export default async function SeekerOpportunitiesPage() {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth/signin");

    // Fetch seeker record
    const { data: seeker } = await supabase
        .from("job_seekers")
        .select("id")
        .eq("user_id", user.id)
        .single();

    let matches: any[] = [];
    if (seeker) {
        matches = await getSeekerOpportunityMatches(seeker.id);
    }

    // Fallback: public active opportunities if no matches
    const allOpportunities = await getPublicOpportunities({ limit: 30 });

    return (
        <SeekerOpportunitiesClient
            initialMatches={matches}
            allOpportunities={allOpportunities}
        />
    );
}
