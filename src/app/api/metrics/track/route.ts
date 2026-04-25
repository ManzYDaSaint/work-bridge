import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
    try {
        const text = await request.text();
        if (!text) {
            return NextResponse.json({ success: true, message: "Empty payload ignored" });
        }
        const body = JSON.parse(text);
        const supabase = await createSupabaseServerClient();
        const cookieStore = await cookies();
        const variant = cookieStore.get("wb_exp_onboarding")?.value || null;

        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user ?? null;

        const sessionId = cookieStore.get("sb-access-token")?.value?.slice(0, 24) || null;

        const payload = {
            user_id: user?.id || null,
            action: body.eventName || "UNKNOWN_METRIC_EVENT",
            path: "/api/metrics/track",
            method: "POST",
            status_code: 200,
            metadata: {
                session_id: sessionId,
                role: body.role || null,
                stage: body.stage || null,
                variant,
                ...body.metadata
            }
        };

        const adminClient = getSupabaseAdminClient();
        if (!adminClient) {
            return NextResponse.json({ success: true, message: "Tracking skipped (Admin key missing)" });
        }

        const { error } = await adminClient.from("audit_logs").insert(payload);
        if (error) {
            console.error("Metrics track DB error:", error);
            // Don't fail the request for a tracking error, but log it
            return NextResponse.json({ success: true, warning: "Failed to track event" });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Metrics track parse error:", e);
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
}
