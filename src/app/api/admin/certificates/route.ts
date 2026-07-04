import { createSupabaseServerClient } from "@/lib/supabase-server";
import { validateAuth } from "@/lib/auth-guard";
import { NextResponse } from "next/server";
import { recordAuditLog } from "@/lib/audit";

export async function GET() {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const { data: certificates, error } = await supabase
            .from("certificates")
            .select(`*, job_seekers (full_name, email)`)
            .eq("is_verified", false)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return NextResponse.json(certificates);
    } catch (error) {
        console.error("Fetch certificates error:", error);
        return NextResponse.json({ error: "Failed to fetch certificates" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const { certificateId, isVerified, verificationTier } = await request.json();
        
        if (!certificateId) {
            return NextResponse.json({ error: "certificateId is required" }, { status: 400 });
        }

        const { error } = await supabase
            .from("certificates")
            .update({ 
                is_verified: isVerified, 
                verification_tier: verificationTier 
            })
            .eq("id", certificateId);

        if (error) throw error;

        await recordAuditLog({
            action: `CERTIFICATE_VERIFICATION_${isVerified ? 'APPROVED' : 'REJECTED'}`,
            path: "/api/admin/certificates",
            method: "PATCH",
            statusCode: 200,
            userId: auth.user.id,
            metadata: { certificateId, isVerified, verificationTier }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Update certificate error:", error);
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}
