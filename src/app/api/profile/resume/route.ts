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
        const file = formData.get("resume") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const fileExt = file.name.split('.').pop();
        // Use a cleaner path without Math.random() dots which might confuse folder logic
        const timestamp = Date.now();
        const filePath = `${user.id}/resume_${timestamp}.${fileExt}`;

        console.log(`Uploading resume to: ${filePath}`);

        const { error: uploadError } = await supabase.storage
            .from("resumes")
            .upload(filePath, file, {
                upsert: true,
                contentType: file.type
            });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
            .from("resumes")
            .getPublicUrl(filePath);

        const resumeUrl = publicUrlData.publicUrl;

        // Update profile
        const { error: updateError } = await supabase
            .from("job_seekers")
            .update({ resume_url: resumeUrl })
            .eq("id", user.id);

        if (updateError) {
            // we'll try to insert if record doesn't exist
            if (updateError.code === "PGRST116" || updateError.code === "23503") {
                const { error: upsertError } = await supabase
                    .from("job_seekers")
                    .upsert({ id: user.id, resume_url: resumeUrl });
                if (upsertError) throw upsertError;
            } else {
                throw updateError;
            }
        }

        return NextResponse.json({ success: true, url: resumeUrl });
    } catch (error: any) {
        console.error("Resume upload error:", error);
        return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
    }
}
