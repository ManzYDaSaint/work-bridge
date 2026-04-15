import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("avatar") as File | null;

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
        const filePath = `${user.id}/avatar_${timestamp}.${fileExt}`;

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

        // Update job_seekers record
        const { error: updateError } = await supabase
            .from("job_seekers")
            .update({ avatar_url: avatarUrl })
            .eq("id", user.id);

        if (updateError) {
            // Upsert if record doesn't exist yet
            if (updateError.code === "PGRST116" || updateError.code === "23503") {
                const { data: userData } = await supabase.from("users").select("email").eq("id", user.id).single();
                const fallbackName = userData?.email?.split("@")[0] || "";
                await supabase.from("job_seekers").upsert({
                    id: user.id,
                    avatar_url: avatarUrl,
                    full_name: fallbackName
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
}
