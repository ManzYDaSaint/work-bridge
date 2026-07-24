import { redirect } from "next/navigation";
import EmployerCRMClient from "./EmployerCRMClient";
import { validateAuth } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function EmployerCRMPage() {
    const auth = await validateAuth(["ADMIN"], false);
    if (auth.error || !auth.user) {
        redirect("/login");
    }

    const supabase = getSupabaseAdminClient();
    let profiles: any[] = [];

    if (supabase) {
        const { data, error } = await supabase
            .from("employer_crm_profiles")
            .select(`
                *,
                employer:employers(company_name, industry, location)
            `)
            .order("updated_at", { ascending: false });

        if (!error) profiles = data || [];
    }

    return <EmployerCRMClient initialProfiles={profiles} />;
}
