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
        .or(`user_id.eq.${auth.user.id},id.eq.${auth.user.id}`)
        .maybeSingle();

    if (error) {
        console.error("[EmployerSettingsPage] Error fetching profile:", error);
    }

    return (
        <SettingsClient 
            profile={{
                companyName: profile?.company_name ?? "",
                industry: profile?.industry ?? "",
                location: profile?.location ?? "",
                website: profile?.website ?? "",
                description: profile?.description ?? "",
                logoUrl: profile?.logo_url ?? "",
                recruitmentEmail: profile?.recruitment_email ?? "",
                recruitmentUrl: profile?.recruitment_url ?? "",
                defaultApplicationMethod: profile?.default_application_method ?? "one_tap",
                defaultApplyPhone: profile?.default_apply_phone ?? "",
                defaultApplyWhatsapp: profile?.default_apply_whatsapp ?? "",
                defaultSchedulingLink: profile?.default_scheduling_link ?? "",
                applicationAlerts: profile?.application_alerts ?? true,
            }}
            status={profile?.status ?? "PENDING"}
            recruiterVerified={profile?.recruiter_verified ?? false}
            plan={profile?.plan ?? "FREE"}
        />
    );
}


export const dynamic = "force-dynamic";
