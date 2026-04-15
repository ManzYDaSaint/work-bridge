import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { recordAuditLog } from "@/lib/audit";
import { sendPaymentConfirmationEmail } from "@/lib/resend";
import crypto from "crypto";

export async function POST(request: Request) {
    try {
        // 1. Verify Webhook Signature for PayChangu
        const signature = request.headers.get("x-paychangu-signature") || request.headers.get("signature");
        const secretHash = process.env.PAYCHANGU_WEBHOOK_SECRET;

        // Retrieve raw body for HMAC hash
        const rawBody = await request.text();
        
        if (process.env.NODE_ENV === "production") {
            if (!signature || !secretHash) {
                return NextResponse.json({ error: "Missing Signature or Secret" }, { status: 401 });
            }
            const computedSignature = crypto.createHmac('sha256', secretHash).update(rawBody).digest('hex');
            if (computedSignature !== signature) {
                return NextResponse.json({ error: "Invalid Webhook Signature" }, { status: 401 });
            }
        }

        const payload = JSON.parse(rawBody);

        // 2. Only process successful charges
        if (payload.event === "charge.success" && (payload.data?.status === "successful" || payload.data?.status === "success")) {
            const supabase = await createSupabaseServerClient();
            const email = payload.data.customer?.email || payload.data.email;
            const customerName = payload.data.customer?.first_name ? `${payload.data.customer.first_name} ${payload.data.customer.last_name || ''}` : "User";
            const amount = payload.data.amount;
            const currency = payload.data.currency;
            const txRef = payload.data.tx_ref;

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
                payment_method: "PAYCHANGU"
            }, { onConflict: "tx_ref" });

            // 5. Route action based on tx_ref prefix
            if (user.role === "EMPLOYER" && txRef.startsWith("wb-emp-premium-")) {
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 30);

                // Update employer row
                await supabase
                    .from("employers")
                    .update({ plan: 'PREMIUM', plan_expires_at: expiresAt.toISOString() })
                    .eq("id", user.id);

                // Create subscription record
                await supabase.from("subscriptions").insert({
                    user_id: user.id,
                    plan: 'PREMIUM',
                    status: 'ACTIVE',
                    end_date: expiresAt.toISOString(),
                });

                await recordAuditLog({
                    action: "EMPLOYER_PREMIUM_ACTIVATED",
                    path: "/api/webhooks/paychangu",
                    method: "POST",
                    statusCode: 200,
                    userId: user.id,
                    metadata: { txRef, amount, currency }
                });

                await sendPaymentConfirmationEmail(email, {
                    name: customerName,
                    amount,
                    currency,
                    reference: txRef,
                    description: "Your WorkBridge Premium Employer plan is now active for 30 days.",
                    dashboardPath: "/dashboard/employer",
                });

                return NextResponse.json({ success: true, message: "Employer Premium activated" });

            } else if (user.role === "JOB_SEEKER") {
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
                        path: "/api/webhooks/paychangu",
                        method: "POST",
                        statusCode: 200,
                        userId: user.id,
                        metadata: { txRef, amount, currency, badge_seeker_number }
                    });

                    await sendPaymentConfirmationEmail(email, {
                        name: customerName,
                        amount,
                        currency,
                        reference: txRef,
                        description: "Your WorkBridge Badge is now active.",
                        dashboardPath: "/dashboard/seeker",
                    });

                    return NextResponse.json({ success: true, message: "WorkBridge Badge activated" });

                } else if (txRef.startsWith("wb-plus-")) {
                    // Grant plus subscription
                    await supabase
                        .from("job_seekers")
                        .update({ is_subscribed: true })
                        .eq("id", user.id);

                    await recordAuditLog({
                        action: "PLUS_SUBSCRIPTION_ACTIVATED",
                        path: "/api/webhooks/paychangu",
                        method: "POST",
                        statusCode: 200,
                        userId: user.id,
                        metadata: { txRef, amount, currency }
                    });

                    await sendPaymentConfirmationEmail(email, {
                        name: customerName,
                        amount,
                        currency,
                        reference: txRef,
                        description: "Your WorkBridge Plus subscription is now active.",
                        dashboardPath: "/dashboard/seeker",
                    });

                    return NextResponse.json({ success: true, message: "Plus subscription activated" });

                } else {
                    // Legacy fallback for older subscription references (Job Seekers)
                    await supabase
                        .from("job_seekers")
                        .update({ is_subscribed: true })
                        .eq("id", user.id);

                    await recordAuditLog({
                        action: "PAYMENT_SUCCESS",
                        path: "/api/webhooks/paychangu",
                        method: "POST",
                        statusCode: 200,
                        userId: user.id,
                        metadata: { txRef, amount, currency }
                    });

                    await sendPaymentConfirmationEmail(email, {
                        name: customerName,
                        amount,
                        currency,
                        reference: txRef,
                        description: "Your WorkBridge payment has been recorded successfully.",
                        dashboardPath: "/dashboard/seeker",
                    });

                    return NextResponse.json({ success: true, message: "Subscription activated" });
                }
            }

            return NextResponse.json({ success: true, message: "Payment recorded" });
        }

        return NextResponse.json({ success: true, message: "Webhook received but unhandled event" });
    } catch (error: any) {
        console.error("PayChangu Webhook Error:", error);
        return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
    }
}
