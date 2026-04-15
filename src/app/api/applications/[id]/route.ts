import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await validateAuth(["JOB_SEEKER"]);
    if (auth.error) return auth.error;

    const { id } = await params;

    if (!id) {
        return NextResponse.json({ error: "Application ID is required" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Ensure the application belongs to this seeker before deleting
    const { data: existing, error: fetchError } = await supabase
        .from("applications")
        .select("id")
        .eq("id", id)
        .eq("user_id", auth.userId)
        .single();

    if (fetchError || !existing) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const { error: deleteError } = await supabase
        .from("applications")
        .delete()
        .eq("id", id);

    if (deleteError) {
        console.error("Application DELETE error:", deleteError);
        return NextResponse.json({ error: "Failed to withdraw application" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
