import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { PayChanguProvider } from "@/lib/subscription/paychangu-provider";
import { recordAuditLog } from "@/lib/audit";
import { emitSystemEvent } from "@/lib/mission-control";
import { formatMalawiPhone } from "@/lib/phone-utils";

export async function GET() {
    const auth = await validateAuth(['JOB_SEEKER', 'ADMIN'], false);
    if (auth.error || !auth.user) return auth.error;

    const supabase = getSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: "Database client unavailable" }, { status: 500 });

    try {
        // Fetch job_seeker record (id is the primary key and auth user foreign key)
        let { data: seeker } = await supabase
            .from("job_seekers")
            .select("id, full_name, phone")
            .or(`id.eq.${auth.user.id},user_id.eq.${auth.user.id}`)
            .maybeSingle();

        if (!seeker) {
            // Auto-create basic seeker profile if missing
            const fallbackName = auth.user.email?.split("@")[0] || "Seeker";
            const { data: newSeeker, error: createError } = await supabase
                .from("job_seekers")
                .upsert({
                    id: auth.user.id,
                    full_name: fallbackName,
                    location: "To be updated"
                })
                .select("id, full_name, phone")
                .single();

            if (createError || !newSeeker) {
                return NextResponse.json({ error: "Job seeker profile not found" }, { status: 404 });
            }
            seeker = newSeeker;
        }

        // Fetch active premium subscription
        const { data: sub } = await supabase
            .from("premium_subscriptions")
            .select("*")
            .eq("seeker_id", seeker.id)
            .eq("status", "ACTIVE")
            .order("ends_at", { ascending: false })
            .maybeSingle();

        const isPremium = sub && new Date(sub.ends_at) > new Date();

        // Fetch notification preferences
        const { data: prefs } = await supabase
            .from("notification_preferences")
            .select("*")
            .eq("seeker_id", seeker.id)
            .maybeSingle();

        return NextResponse.json({
            isPremium: !!isPremium,
            subscription: isPremium ? sub : null,
            seeker: {
                id: seeker.id,
                name: seeker.full_name,
                phone: seeker.phone
            },
            preferences: prefs || {
                whatsapp_enabled: true,
                min_match_score: 60,
                frequency: "INSTANT"
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const auth = await validateAuth(['JOB_SEEKER'], false);
    if (auth.error || !auth.user) return auth.error;

    const supabase = getSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: "Database client unavailable" }, { status: 500 });

    try {
        const body = await request.json();
        const { action, durationMonths = 1, phone, whatsappEnabled, minMatchScore } = body;

        // Fetch seeker profile (id is primary key and auth user FK)
        let { data: seeker } = await supabase
            .from("job_seekers")
            .select("id, full_name, phone")
            .or(`id.eq.${auth.user.id},user_id.eq.${auth.user.id}`)
            .maybeSingle();

        if (!seeker) {
            const fallbackName = auth.user.email?.split("@")[0] || "Seeker";
            const { data: newSeeker, error: createError } = await supabase
                .from("job_seekers")
                .upsert({
                    id: auth.user.id,
                    full_name: fallbackName,
                    location: "To be updated"
                })
                .select("id, full_name, phone")
                .single();

            if (createError || !newSeeker) {
                return NextResponse.json({ error: "Job seeker profile not found" }, { status: 404 });
            }
            seeker = newSeeker;
        }

        // ACTION 1: Initiate Payment / Checkout
        if (action === "INITIATE_CHECKOUT") {
            if (phone) {
                const phoneCheck = formatMalawiPhone(phone);
                if (!phoneCheck.isValid) {
                    return NextResponse.json({ error: phoneCheck.error || "Invalid Malawian phone number" }, { status: 400 });
                }
                await supabase.from("job_seekers").update({ phone: phoneCheck.formatted }).eq("id", seeker.id);
            }

            const amountPerMonth = 1000; // MWK 1,000 / month
            const totalAmount = amountPerMonth * Number(durationMonths);

            const provider = new PayChanguProvider();
            const checkout = await provider.initiatePayment(seeker.id, totalAmount);

            return NextResponse.json({
                success: true,
                paymentUrl: checkout.paymentUrl,
                reference: checkout.reference,
                isSimulated: checkout.isSimulated || false,
                amount: totalAmount
            });
        }

        // ACTION 2: Activate / Verify Subscription (Requires Valid Payment Verification & Stacked End Date)
        if (action === "ACTIVATE_PREMIUM" || action === "VERIFY_PAYMENT") {
            const { reference } = body;
            if (!reference) {
                return NextResponse.json({ error: "Reference required for verification" }, { status: 400 });
            }

            const provider = new PayChanguProvider();
            const verification = await provider.verifyPayment(reference);

            if (!verification.success) {
                return NextResponse.json({
                    success: false,
                    verified: false,
                    error: "Payment verification pending or was not completed on PayChangu."
                }, { status: 200 });
            }

            // Subscription Stacking Logic: extend from existing ends_at if subscription is currently active
            const { data: currentSub } = await supabase
                .from("premium_subscriptions")
                .select("ends_at, status")
                .eq("seeker_id", seeker.id)
                .eq("status", "ACTIVE")
                .maybeSingle();

            let baseDate = new Date();
            if (currentSub?.ends_at && new Date(currentSub.ends_at) > baseDate) {
                baseDate = new Date(currentSub.ends_at);
            }

            const endsAt = new Date(baseDate);
            endsAt.setMonth(endsAt.getMonth() + Number(durationMonths));
            const amount = verification.amount || (500 * Number(durationMonths));

            const { data: subData, error: subErr } = await supabase.from("premium_subscriptions").upsert({
                seeker_id: seeker.id,
                status: "ACTIVE",
                ends_at: endsAt.toISOString(),
                payment_provider: "PAYCHANGU",
                payment_reference: reference
            }, { onConflict: "seeker_id" }).select("id").maybeSingle();

            if (subErr) {
                console.error("[Subscription API] premium_subscriptions upsert error:", subErr);
            }

            let subscriptionId = subData?.id;
            if (!subscriptionId) {
                const { data: existingSub } = await supabase
                    .from("premium_subscriptions")
                    .select("id")
                    .eq("seeker_id", seeker.id)
                    .maybeSingle();
                subscriptionId = existingSub?.id;
            }

            if (subscriptionId) {
                const { error: paymentErr } = await supabase.from("subscription_payments").insert({
                    subscription_id: subscriptionId,
                    amount: amount,
                    currency: "MWK",
                    status: "PAID",
                    provider_reference: reference
                });
                if (paymentErr) {
                    console.error("[Subscription API] Failed to insert subscription_payments record:", paymentErr);
                }
            }

            // Update user plan in users table
            await supabase.from("users").update({ plan: "PREMIUM" }).eq("id", auth.user.id);

            // Update phone if provided
            if (phone) {
                const phoneCheck = formatMalawiPhone(phone);
                if (phoneCheck.isValid) {
                    await supabase.from("job_seekers").update({ phone: phoneCheck.formatted }).eq("id", seeker.id);
                }
            }

            await recordAuditLog({
                action: "subscription_SEEKER_PREMIUM_ACTIVATED",
                path: "/api/seeker/subscription",
                method: "POST",
                statusCode: 200,
                userId: auth.user.id,
                metadata: { seekerId: seeker.id, durationMonths, endsAt: endsAt.toISOString(), reference }
            });

            await emitSystemEvent({
                category: "USER",
                severity: "SUCCESS",
                event: "PREMIUM_SUBSCRIBED",
                message: `Job seeker ${seeker.full_name || auth.user.email} activated Aganyu Premium for ${durationMonths} month(s)`,
                actorId: auth.user.id,
                metadata: { seekerId: seeker.id, durationMonths, reference }
            });

            return NextResponse.json({
                success: true,
                verified: true,
                message: "Aganyu Premium activated successfully!",
                endsAt: endsAt.toISOString()
            });
        }

        // ACTION 3: Update WhatsApp Preferences & Phone
        if (action === "UPDATE_PREFERENCES") {
            let formattedPhone = phone;
            if (phone) {
                const phoneCheck = formatMalawiPhone(phone);
                if (!phoneCheck.isValid) {
                    return NextResponse.json({ error: phoneCheck.error || "Invalid Malawian phone number format" }, { status: 400 });
                }
                formattedPhone = phoneCheck.formatted;
                await supabase.from("job_seekers").update({ phone: formattedPhone }).eq("id", seeker.id);
            }

            await supabase.from("notification_preferences").upsert({
                seeker_id: seeker.id,
                whatsapp_enabled: whatsappEnabled !== undefined ? whatsappEnabled : true,
                min_match_score: minMatchScore || 60,
                frequency: "INSTANT",
                updated_at: new Date().toISOString()
            }, { onConflict: "seeker_id" });

            return NextResponse.json({
                success: true,
                message: "WhatsApp notification preferences updated",
                phone: formattedPhone
            });
        }

        // ACTION 4: Send Test WhatsApp Alert
        if (action === "SEND_TEST_ALERT") {
            const targetPhone = phone || seeker.phone;
            if (!targetPhone) {
                return NextResponse.json({ error: "Please enter and save a valid WhatsApp phone number first." }, { status: 400 });
            }

            const phoneCheck = formatMalawiPhone(targetPhone);
            if (!phoneCheck.isValid) {
                return NextResponse.json({ error: phoneCheck.error || "Invalid Malawian phone number" }, { status: 400 });
            }

            try {
                const { sendWhatsAppTemplate } = await import("@/lib/notification/worker");

                // Try Meta's pre-approved 'hello_world' test template first
                try {
                    await sendWhatsAppTemplate(phoneCheck.formatted, "hello_world", {
                        languageCode: "en_US"
                    });
                } catch (firstErr: any) {
                    console.warn("[WhatsApp Worker] hello_world template failed, trying job_match_alert fallback:", firstErr?.message);
                    await sendWhatsAppTemplate(phoneCheck.formatted, "job_match_alert", {
                        parameters: [
                            { type: "text", text: seeker.full_name || "Valued Seeker" },
                            { type: "text", text: "Senior Software Engineer" },
                            { type: "text", text: "95% Match Score" }
                        ]
                    });
                }

                return NextResponse.json({
                    success: true,
                    message: `Test WhatsApp message sent successfully to ${phoneCheck.formatted}!`
                });
            } catch (err: any) {
                console.error("[Test Alert Error]:", err);
                return NextResponse.json({
                    success: false,
                    error: err.message || "Failed to send WhatsApp test message. Check Meta WhatsApp API configuration."
                }, { status: 400 });
            }
        }

        // ACTION 5: Cancel Subscription
        if (action === "CANCEL_SUBSCRIPTION") {
            await supabase
                .from("premium_subscriptions")
                .update({ status: "CANCELLED" })
                .eq("seeker_id", seeker.id);

            await supabase.from("users").update({ plan: "FREE" }).eq("id", auth.user.id);

            return NextResponse.json({ success: true, message: "Subscription cancelled." });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error: any) {
        console.error("Seeker subscription error:", error);
        return NextResponse.json({ error: error.message || "Operation failed" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";

