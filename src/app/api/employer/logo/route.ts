import { createSupabaseServerClient } from "@/lib/supabase-server";
import { withAuth } from "@/lib/auth-guard";
import { NextResponse } from "next/server";

export const POST = withAuth(async (request, auth) => {
    const supabase = await createSupabaseServerClient();
    const userId = auth.userId;

    try {
        const formData = await request.formData();
        const file = formData.get("logo") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (!file.type.startsWith("image/")) {
            return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
        }

        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });
        }

        const fileExt = file.name.split(".").pop() || "jpg";
        const timestamp = Date.now();
        const filePath = `${userId}/logo_${timestamp}.${fileExt}`;

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

        const { error: updateError } = await supabase
            .from("employers")
            .update({ logo_url: logoUrl })
            .eq("id", userId);

        if (updateError) {
            throw updateError;
        }

        return NextResponse.json({ success: true, url: logoUrl });
    } catch (error: any) {
        console.error("Employer logo upload error:", error);
        return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
    }
}, ["EMPLOYER"], false, false);
