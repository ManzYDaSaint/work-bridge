import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the user is an employer
    const { data: employer, error: employerError } = await supabase
        .from('employers')
        .select('id')
        .eq('id', user.id)
        .single();

    if (employerError || !employer) {
        return NextResponse.json({ error: "Unauthorized. Must be an employer" }, { status: 403 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("logo") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Validate image type
        if (!file.type.startsWith("image/")) {
            return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
        }

        // Max 5MB
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });
        }

        const fileExt = file.name.split(".").pop() || "jpg";
        const timestamp = Date.now();
        const filePath = `${user.id}/logo_${timestamp}.${fileExt}`;

        // Upload to company_logos bucket
        const { error: uploadError } = await supabase.storage
            .from("company_logos")
            .upload(filePath, file, {
                upsert: true,
                contentType: file.type,
            });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
            .from("company_logos")
            .getPublicUrl(filePath);

        const logoUrl = publicUrlData.publicUrl;

        // Update employer record
        const { error: updateError } = await supabase
            .from("employers")
            .update({ logo_url: logoUrl })
            .eq("id", user.id);

        if (updateError) {
            throw updateError;
        }

        return NextResponse.json({ success: true, url: logoUrl });
    } catch (error: any) {
        console.error("Employer logo upload error:", error);
        return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
    }
}
