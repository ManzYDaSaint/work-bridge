import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { getAllOpportunitiesAdmin, getOpportunityAnalytics } from "@/services/opportunityService";
import AdminOpportunitiesClient from "./AdminOpportunitiesClient";

export const metadata = {
    title: "Opportunities — Aganyu Admin",
};

export default async function AdminOpportunitiesPage() {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth/signin");

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "ADMIN") redirect("/dashboard");

    const [opportunities, analytics] = await Promise.all([
        getAllOpportunitiesAdmin({ limit: 50 }),
        getOpportunityAnalytics(),
    ]);

    return <AdminOpportunitiesClient initialOpportunities={opportunities} analytics={analytics} />;
}
