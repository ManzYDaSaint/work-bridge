import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import CreateOpportunityClient from "./CreateOpportunityClient";

export const metadata = {
    title: "Create Opportunity — Aganyu Admin",
};

export default async function CreateOpportunityPage() {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth/signin");

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "ADMIN") redirect("/dashboard");

    return <CreateOpportunityClient adminId={user.id} />;
}
