import { createSupabaseServerClient } from "@/lib/supabase-server";
import { withAuth } from "@/lib/auth-guard";
import { NextResponse } from "next/server";

export const POST = withAuth(async (request, auth) => {
    const supabase = await createSupabaseServerClient();
    const userId = auth.userId;

    try {
        const formData = await request.formData();
        const file = formData.get("resume") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const allowedTypes = ["application/pdf"];

        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: "Only PDF files are accepted. Please convert your resume to PDF and try again." }, { status: 400 });
        }

        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "Resume file must be under 5MB" }, { status: 400 });
        }

        const fileExt = file.name.split(".").pop() || "pdf";
        const timestamp = Date.now();
        const filePath = `${userId}/resume_${timestamp}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from("resumes")
            .upload(filePath, file, {
                upsert: true,
                contentType: file.type,
            });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
            .from("resumes")
            .getPublicUrl(filePath);

        const resumeUrl = publicUrlData.publicUrl;

        const { error: updateError } = await supabase
            .from("job_seekers")
            .update({ resume_url: resumeUrl })
            .eq("id", userId);

        if (updateError) {
            throw updateError;
        }

        return NextResponse.json({ success: true, url: resumeUrl });
    } catch (error: any) {
        console.error("Resume upload error:", error);
        return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
    }
}, undefined, false, false);

export const DELETE = withAuth(async (_request, auth) => {
    const supabase = await createSupabaseServerClient();
    const userId = auth.userId;

    try {
        const { data: seeker, error: seekerError } = await supabase
            .from("job_seekers")
            .select("resume_url")
            .eq("id", userId)
            .single();

        if (seekerError) throw seekerError;

        if (seeker?.resume_url) {
            const resumeUrl = seeker.resume_url;
            const parts = resumeUrl.split("/public/resumes/");
            if (parts.length > 1) {
                const filePath = parts[1];
                await supabase.storage.from("resumes").remove([filePath]);
            }
        }

        const { error: updateError } = await supabase
            .from("job_seekers")
            .update({ resume_url: null })
            .eq("id", userId);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Resume delete error:", error);
        return NextResponse.json({ error: error.message || "Failed to delete resume" }, { status: 500 });
    }
}, undefined, false, false);
