import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await params;
    const certId = resolvedParams.id;

    // RLS will enforce ownership, but let's be explicit
    const { error } = await supabase
        .from("certificates")
        .delete()
        .eq("id", certId)
        .eq("seeker_id", user.id);

    if (error) {
        console.error("Certificate delete error:", error);
        return NextResponse.json({ error: error.message || "Delete failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
