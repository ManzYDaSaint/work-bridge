import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    const body = await request.json();
    const reason = String(body.reason || "").trim();
    if (!reason) {
        return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("trust_reports").insert({
        reporter_id: auth.userId,
        target_user_id: body.targetUserId || null,
        context_type: body.contextType || null,
        context_id: body.contextId || null,
        reason,
    });

    if (error) {
        return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
