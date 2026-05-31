import { createSupabaseServerClient } from "@/lib/supabase-server";
import { withAuth } from "@/lib/auth-guard";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_request, auth) => {
    const supabase = await createSupabaseServerClient();
    const userId = auth.userId;

    const { data: notifications, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const response = NextResponse.json(notifications);
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
}, undefined, false, false);

export const PUT = withAuth(async (request, auth) => {
    const supabase = await createSupabaseServerClient();
    const userId = auth.userId;
    const { id, all } = await request.json();

    if (all) {
        const { error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", userId)
            .eq("is_read", false);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else if (id) {
        const { error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", userId)
            .eq("id", id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath("/", "layout");

    return NextResponse.json({ success: true });
}, undefined, false, false);
