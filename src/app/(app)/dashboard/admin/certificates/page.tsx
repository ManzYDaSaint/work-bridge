import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { validateAuth } from "@/lib/auth-guard";
import CertificateVerificationClient from "@/components/dashboard/admin/CertificateVerificationClient";

export default async function CertificateVerificationPage() {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) redirect("/login");

    const supabase = await createSupabaseServerClient();

    const { data: certificates, error } = await supabase
        .from("certificates")
        .select(`*, job_seekers (full_name, email)`)
        .eq("is_verified", false)
        .order("created_at", { ascending: false });

    if (error) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <p className="text-slate-500">Failed to load certificates. Please try refreshing.</p>
            </div>
        );
    }

    return <CertificateVerificationClient initialCertificates={certificates || []} />;
}
