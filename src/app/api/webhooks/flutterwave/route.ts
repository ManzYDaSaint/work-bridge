import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { recordAuditLog } from "@/lib/audit";

export async function POST(request: Request) {
    try {
        // 1. Verify Webhook Signature
        const signature = request.headers.get("verif-hash");
        const secretHash = process.env.FLUTTERWAVE_WEBHOOK_SECRET;

        // In a real production environment, you must verify the signature
        if (process.env.NODE_ENV === "production" && (!signature || signature !== secretHash)) {
            return NextResponse.json({ error: "Invalid Webhook Signature" }, { status: 401 });
        }

        const payload = await request.json();

        // 2. We only care about successful charges
        if (payload.event === "charge.completed" && payload.data.status === "successful") {
            const supabase = await createSupabaseServerClient();
            const email = payload.data.customer?.email;
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

            // 4. Record the specific transaction
            await supabase.from("transactions").upsert({
                user_id: user.id,
                amount: amount,
                currency: currency,
                status: "SUCCESS",
                tx_ref: txRef,
                payment_method: "FLUTTERWAVE"
            }, { onConflict: "tx_ref" });

            // 5. Upgrade the specific role
            if (user.role === "JOB_SEEKER") {
                await supabase
                    .from("job_seekers")
                    .update({ is_subscribed: true })
                    .eq("id", user.id);
            }

            // 6. Record Audit Log cleanly
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

        return NextResponse.json({ success: true, message: "Webhook received but unhandled event" });
    } catch (error: any) {
        console.error("Flutterwave Webhook Error:", error);
        return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
    }
}
