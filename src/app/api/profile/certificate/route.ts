import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

const MAX_CERTS = 5;

// ── GET — list all certificates for this seeker ────────────────────────────────
export async function GET() {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .eq("seeker_id", user.id)
        .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const certs = (data || []).map(c => ({
        id: c.id,
        seekerId: c.seeker_id,
        url: c.url,
        fileName: c.file_name || c.title,
        parsedQualification: c.title,
        parsedCertName: c.title,
        isNameVerified: c.is_verified,
        createdAt: c.created_at,
        verificationTier: c.verification_tier,
        issuer: c.issuer
    }));

    return NextResponse.json(certs);
}

// ── POST — upload a new certificate ───────────────────────────────────────────
export async function POST(request: Request) {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        // 1. Check current count
        const { count } = await supabase
            .from("certificates")
            .select("id", { count: "exact", head: true })
            .eq("seeker_id", user.id);

        if ((count ?? 0) >= MAX_CERTS) {
            return NextResponse.json(
                { error: `You can upload a maximum of ${MAX_CERTS} certificates.` },
                { status: 400 }
            );
        }

        // 2. Get file from form data
        const formData = await request.formData();
        const file = formData.get("certificate") as File | null;
        if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

        // 3. Upload to storage
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/cert_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const fileBuffer = Buffer.from(await file.arrayBuffer());

        const { error: uploadError } = await supabase.storage
            .from("resumes")
            .upload(filePath, fileBuffer, { upsert: false, contentType: file.type });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from("resumes").getPublicUrl(filePath);
        const certUrl = publicUrlData.publicUrl;

        // 4. Insert certificate for manual review
        const { data: certRecord, error: insertError } = await supabase
            .from("certificates")
            .insert({
                seeker_id: user.id,
                title: file.name,
                issuer: formData.get("issuer")?.toString() || "Pending review",
                credential_url: certUrl,
                is_verified: false,
                verification_tier: -1,
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({
            success: true,
            certificate: certRecord
        });
    } catch (error: any) {
        console.error("Certificate upload error:", error);
        return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
    }
}
