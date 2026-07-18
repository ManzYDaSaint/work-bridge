import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthOptional } from "@/lib/auth-guard";

export async function POST(request: Request) {
    try {
        const text = await request.text();
        if (!text) {
            return NextResponse.json({ success: true, message: "Empty payload ignored" });
        }
        const body = JSON.parse(text);
        const cookieStore = await cookies();
        const variant = cookieStore.get("wb_exp_onboarding")?.value || null;

        const auth = await getAuthOptional();
        const user = auth.user;

        let visitorId = cookieStore.get("visitor_id")?.value;
        let isNewVisitor = false;
        if (!visitorId) {
            visitorId = crypto.randomUUID();
            isNewVisitor = true;
        }

        const sessionId = cookieStore.get("sb-access-token")?.value?.slice(0, 24) || visitorId;

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

        const { error: auditError } = await adminClient.from("audit_logs").insert(payload);
        if (auditError) {
            console.error("Metrics track DB error (audit):", auditError);
        }

        if (body.stage) {
            const productEventPayload = {
                user_id: user?.id || null,
                session_id: sessionId,
                role: body.role || null,
                stage: body.stage,
                variant: variant || null
            };
            const { error: funnelError } = await adminClient.from("product_events").insert(productEventPayload);
            if (funnelError) {
                console.error("Metrics track DB error (funnel):", funnelError);
            }
        }

        const response = NextResponse.json({ success: true });
        if (isNewVisitor) {
            response.cookies.set("visitor_id", visitorId, {
                path: "/",
                maxAge: 60 * 60 * 24 * 365, // 1 year
                sameSite: "lax",
            });
        }
        return response;
    } catch (e) {
        console.error("Metrics track parse error:", e);
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
}
