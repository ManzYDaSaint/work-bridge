import { createSupabaseServerClient } from "@/lib/supabase-server";
import { validateAuth } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";
// EmployerProfileValues type intentionally unused in this server wrapper

export default async function EmployerSettingsPage() {
    const auth = await validateAuth(["EMPLOYER"], false, false);
    if (auth.error || !auth.user) {
        redirect("/login");
    }

    const supabase = await createSupabaseServerClient();

    const { data: profile, error } = await supabase
        .from("employers")
        .select("*")
        .eq("id", auth.user.id)
        .single();

    if (error) {
        console.error("[EmployerSettingsPage] Error fetching profile:", error);
        throw new Error("Failed to load company profile.");
    }

    return (
        <SettingsClient 
            profile={{
                companyName: profile.company_name ?? "",
                industry: profile.industry ?? "",
                location: profile.location ?? "",
                website: profile.website ?? "",
                description: profile.description ?? "",
                logoUrl: profile.logo_url ?? "",
                applicationAlerts: profile.application_alerts ?? true,
            }}
            status={profile.status ?? "PENDING"}
            recruiterVerified={profile.recruiter_verified ?? false}
            plan={profile.plan ?? "FREE"}
        />
    );
}
