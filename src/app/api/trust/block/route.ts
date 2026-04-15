import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    const body = await request.json();
    const blockedUserId = String(body.blockedUserId || "");
    if (!blockedUserId) {
        return NextResponse.json({ error: "blockedUserId is required" }, { status: 400 });
    }

    if (blockedUserId === auth.userId) {
        return NextResponse.json({ error: "You cannot block yourself" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    const { data: existing } = await supabase
        .from("user_blocks")
        .select("id")
        .eq("user_id", auth.userId)
        .eq("blocked_user_id", blockedUserId)
        .single();

    if (existing?.id) {
        await supabase.from("user_blocks").delete().eq("id", existing.id);
        return NextResponse.json({ success: true, blocked: false });
    }

    const { error } = await supabase.from("user_blocks").insert({
        user_id: auth.userId,
        blocked_user_id: blockedUserId,
    });

    if (error) {
        return NextResponse.json({ error: "Failed to update block list" }, { status: 500 });
    }

    return NextResponse.json({ success: true, blocked: true });
}
