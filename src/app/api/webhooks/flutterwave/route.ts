import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { recordAuditLog } from "@/lib/audit";

export async function POST(request: Request) {
    try {
        // 1. Verify Webhook Signature
        const signature = request.headers.get("verif-hash");
        const secretHash = process.env.FLUTTERWAVE_WEBHOOK_SECRET;

        if (process.env.NODE_ENV === "production" && (!signature || signature !== secretHash)) {
            return NextResponse.json({ error: "Invalid Webhook Signature" }, { status: 401 });
        }

        const payload = await request.json();

        // 2. Only process successful charges
        if (payload.event === "charge.completed" && payload.data.status === "successful") {
            const supabase = await createSupabaseServerClient();
            const email = payload.data.customer?.email;
            const amount = payload.data.amount;
            const currency = payload.data.currency;
            const txRef = payload.data.tx_ref as string;

            if (!email) {
                return NextResponse.json({ error: "No customer email found" }, { status: 400 });
            }

            // 3. Find user by email
            const { data: user, error: userError } = await supabase
                .from("users")
                .select("id, role")
                .eq("email", email)
                .single();

            if (userError || !user) {
                console.error("Webhook: User not found for email:", email);
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }

            // 4. Record transaction
            await supabase.from("transactions").upsert({
                user_id: user.id,
                amount,
                currency,
                status: "SUCCESS",
                tx_ref: txRef,
                payment_method: "FLUTTERWAVE"
            }, { onConflict: "tx_ref" });

            // 5. Route action based on tx_ref prefix
            if (user.role === "JOB_SEEKER") {
                if (txRef.startsWith("wb-badge-")) {
                    // Grant the WorkBridge Badge
                    // Assign the next badge number
                    const { count } = await supabase
                        .from("job_seekers")
                        .select("id", { count: "exact", head: true })
                        .eq("has_badge", true);

                    const badge_seeker_number = (count ?? 0) + 1;

                    await supabase
                        .from("job_seekers")
                        .update({ has_badge: true, badge_seeker_number })
                        .eq("id", user.id);

                    await recordAuditLog({
                        action: "BADGE_GRANTED_VIA_PAYMENT",
                        path: "/api/webhooks/flutterwave",
                        method: "POST",
                        statusCode: 200,
                        userId: user.id,
                        metadata: { txRef, amount, currency, badge_seeker_number }
                    });

                    return NextResponse.json({ success: true, message: "WorkBridge Badge activated" });

                } else if (txRef.startsWith("wb-ai-")) {
                    // Grant AI features subscription
                    await supabase
                        .from("job_seekers")
                        .update({ is_subscribed: true })
                        .eq("id", user.id);

                    await recordAuditLog({
                        action: "AI_SUBSCRIPTION_ACTIVATED",
                        path: "/api/webhooks/flutterwave",
                        method: "POST",
                        statusCode: 200,
                        userId: user.id,
                        metadata: { txRef, amount, currency }
                    });

                    return NextResponse.json({ success: true, message: "AI subscription activated" });

                } else {
                    // Legacy: any other tx_ref treated as AI subscription for backwards compat
                    await supabase
                        .from("job_seekers")
                        .update({ is_subscribed: true })
                        .eq("id", user.id);

                    await recordAuditLog({
                        action: "PAYMENT_SUCCESS",
                        path: "/api/webhooks/flutterwave",
                        method: "POST",
                        statusCode: 200,
                        userId: user.id,
                        metadata: { txRef, amount, currency }
                    });

                    return NextResponse.json({ success: true, message: "Subscription activated" });
                }
            }

            return NextResponse.json({ success: true, message: "Payment recorded" });
        }

        return NextResponse.json({ success: true, message: "Webhook received but unhandled event" });
    } catch (error: any) {
        console.error("Flutterwave Webhook Error:", error);
        return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
    }
}
