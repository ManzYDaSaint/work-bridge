import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
    const supabase = await createSupabaseServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: notifications, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const response = NextResponse.json(notifications);
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
}

export async function PUT(request: Request) {
    const supabase = await createSupabaseServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, all } = await request.json();

    if (all) {
        const { error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", user.id)
            .eq("is_read", false);
            
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else if (id) {
        const { error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", user.id)
            .eq("id", id);
            
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Revalidate the entire layout to refresh notification counts everywhere
    revalidatePath("/", "layout");

    return NextResponse.json({ success: true });
}
