import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { getStagedOpportunityById } from "@/services/opportunityIngestionService";
import ReviewStagedOpportunityClient from "./ReviewStagedOpportunityClient";

export const metadata = {
    title: "Review Ingested Opportunity — Aganyu Admin",
};

export default async function ReviewStagedOpportunityPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth/signin");

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "ADMIN") redirect("/dashboard");

    const item = await getStagedOpportunityById(id);
    if (!item) redirect("/dashboard/admin/opportunities?tab=ingestion");

    if (item.status === "APPROVED" && item.published_opportunity_id) {
        redirect(`/dashboard/admin/opportunities/${item.published_opportunity_id}/edit`);
    }

    return <ReviewStagedOpportunityClient item={item} />;
}
