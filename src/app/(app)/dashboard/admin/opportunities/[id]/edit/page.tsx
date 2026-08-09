import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import EditOpportunityClient from "./EditOpportunityClient";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const metadata = {
    title: "Edit Opportunity — Aganyu Admin",
};

export default async function EditOpportunityPage({ params }: { params: { id: string } }) {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth/signin");

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "ADMIN") redirect("/dashboard");

    const adminClient = getSupabaseAdminClient();
    if (!adminClient) redirect("/dashboard/admin/opportunities");

    const { data: opp, error } = await adminClient
        .from("opportunities")
        .select("*")
        .eq("id", params.id)
        .single();

    if (error || !opp) redirect("/dashboard/admin/opportunities");

    return <EditOpportunityClient opportunity={opp} />;
}
