import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { PayChanguProvider } from "@/lib/subscription/paychangu-provider";
import { emitSystemEvent } from "@/lib/mission-control";

/**
 * PayChangu Payment Webhook Handler
 * Auto-activates seeker premium status upon successful payment notification
 */
export async function POST(request: Request) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
        return NextResponse.json({ error: "Admin client unavailable" }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { tx_ref, reference, status, seeker_id, duration_months = 1 } = body;

        const targetRef = tx_ref || reference;
        if (!targetRef) {
            return NextResponse.json({ error: "Transaction reference missing" }, { status: 400 });
        }

        // Verify payment authenticity with PayChangu API
        const provider = new PayChanguProvider();
        const verification = await provider.verifyPayment(targetRef);

        if (verification.success) {
            // Derive seekerId from tx_ref if missing: tx_ref format `aganyu_prem_${seekerId}_${timestamp}`
            let finalSeekerId = seeker_id;
            if (!finalSeekerId && targetRef.startsWith("aganyu_prem_")) {
                const parts = targetRef.split("_");
                finalSeekerId = parts[2]; // Extracted seeker ID fragment or full
            }

            if (finalSeekerId) {
                const endsAt = new Date();
                endsAt.setMonth(endsAt.getMonth() + Number(duration_months));

                // Activate premium subscription
                const { data: subData } = await supabase.from("premium_subscriptions").upsert({
                    seeker_id: finalSeekerId,
                    status: "ACTIVE",
                    ends_at: endsAt.toISOString(),
                    payment_provider: "PAYCHANGU",
                    payment_reference: targetRef
                }, { onConflict: "seeker_id" }).select("id").single();

                if (subData?.id) {
                    await supabase.from("subscription_payments").insert({
                        subscription_id: subData.id,
                        amount: verification.amount || (500 * Number(duration_months)),
                        currency: "MWK",
                        status: "PAID",
                        provider_reference: targetRef
                    });
                }

                // Find user associated with seeker to update plan & phone
                const { data: seeker } = await supabase
                    .from("job_seekers")
                    .select("user_id, phone, full_name")
                    .eq("id", finalSeekerId)
                    .single();

                if (seeker?.user_id) {
                    await supabase.from("users").update({ plan: "PREMIUM" }).eq("id", seeker.user_id);
                }

                // Trigger direct WhatsApp Welcome alert if phone number is present
                if (seeker?.phone) {
                    try {
                        const { sendWhatsAppTemplate } = await import("@/lib/notification/worker");
                        await sendWhatsAppTemplate(seeker.phone, "premium_welcome", {
                            parameters: [
                                { type: "text", text: seeker.full_name || "Valued Seeker" },
                                { type: "text", text: "1 Month Premium" }
                            ]
                        });
                    } catch (waErr) {
                        console.warn("[PayChangu Webhook] WhatsApp alert skipped/failed:", waErr);
                    }
                }

                await emitSystemEvent({
                    category: "USER",
                    severity: "SUCCESS",
                    event: "PAYCHANGU_WEBHOOK_PREMIUM_ACTIVATED",
                    message: `PayChangu webhook confirmed payment for reference ${targetRef}`,
                    actorId: "SYSTEM",
                    metadata: { reference: targetRef, seekerId: finalSeekerId, amount: verification.amount }
                });

                return NextResponse.json({ status: "success", message: "Subscription activated" });
            }
        }

        return NextResponse.json({ status: "ignored", message: "Payment verification pending or unsuccessful" });

    } catch (error: any) {
        console.error("[PayChangu Webhook Error]:", error);
        return NextResponse.json({ error: error.message || "Webhook processing failed" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";

