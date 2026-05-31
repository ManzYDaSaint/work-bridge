import { createSupabaseServerClient } from "@/lib/supabase-server";
import { withAuth } from "@/lib/auth-guard";
import { NextResponse } from "next/server";

export const POST = withAuth(async (request, auth) => {
    const supabase = await createSupabaseServerClient();
    const userId = auth.userId;

    try {
        const formData = await request.formData();
        const file = formData.get("avatar") as File | null;

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
        const filePath = `${userId}/avatar_${timestamp}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, file, {
                upsert: true,
                contentType: file.type,
            });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);

        const avatarUrl = publicUrlData.publicUrl;

        const { error: updateError } = await supabase
            .from("job_seekers")
            .update({ avatar_url: avatarUrl })
            .eq("id", userId);

        if (updateError) {
            if (updateError.code === "PGRST116" || updateError.code === "23503") {
                const { data: userData } = await supabase.from("users").select("email").eq("id", userId).single();
                const fallbackName = userData?.email?.split("@")[0] || "";
                await supabase.from("job_seekers").upsert({
                    id: userId,
                    avatar_url: avatarUrl,
                    full_name: fallbackName,
                });
            } else {
                throw updateError;
            }
        }

        return NextResponse.json({ success: true, url: avatarUrl });
    } catch (error: any) {
        console.error("Avatar upload error:", error);
        return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
    }
}, undefined, false, false);
