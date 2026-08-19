import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { PayChanguProvider } from "@/lib/subscription/paychangu-provider";
import { recordAuditLog } from "@/lib/audit";
import { emitSystemEvent } from "@/lib/mission-control";

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
            const amountPerMonth = 500; // MWK 500 / month
            const totalAmount = amountPerMonth * Number(durationMonths);

            const provider = new PayChanguProvider();
            const checkout = await provider.initiatePayment(seeker.id, totalAmount);

            return NextResponse.json({
                success: true,
                paymentUrl: checkout.paymentUrl,
                reference: checkout.reference,
                amount: totalAmount
            });
        }

        // ACTION 2: Activate Subscription (Simulated / Confirmed Callback)
        if (action === "ACTIVATE_PREMIUM") {
            const { reference } = body;
            const endsAt = new Date();
            endsAt.setMonth(endsAt.getMonth() + Number(durationMonths));

            await supabase.from("premium_subscriptions").upsert({
                seeker_id: seeker.id,
                status: "ACTIVE",
                ends_at: endsAt.toISOString(),
                payment_provider: "PAYCHANGU",
                payment_reference: reference || `pc_checkout_${Date.now()}`
            }, { onConflict: "seeker_id" });

            // Update user plan in users table
            await supabase.from("users").update({ plan: "PREMIUM" }).eq("id", auth.user.id);

            // Update phone if provided
            if (phone) {
                await supabase.from("job_seekers").update({ phone }).eq("id", seeker.id);
            }

            await recordAuditLog({
                action: "subscription_SEEKER_PREMIUM_ACTIVATED",
                path: "/api/seeker/subscription",
                method: "POST",
                statusCode: 200,
                userId: auth.user.id,
                metadata: { seekerId: seeker.id, durationMonths, endsAt: endsAt.toISOString() }
            });

            await emitSystemEvent({
                category: "USER",
                severity: "SUCCESS",
                event: "PREMIUM_SUBSCRIBED",
                message: `Job seeker ${seeker.full_name || auth.user.email} activated Aganyu Premium for ${durationMonths} month(s)`,
                actorId: auth.user.id,
                metadata: { seekerId: seeker.id, durationMonths }
            });

            return NextResponse.json({
                success: true,
                message: "Aganyu Premium activated successfully!",
                endsAt: endsAt.toISOString()
            });
        }

        // ACTION 2b: Verify Payment Reference directly (Return URL Fallback)
        if (action === "VERIFY_PAYMENT") {
            const { reference } = body;
            if (!reference) {
                return NextResponse.json({ error: "Reference required for verification" }, { status: 400 });
            }

            const provider = new PayChanguProvider();
            const verification = await provider.verifyPayment(reference);

            if (verification.success) {
                const endsAt = new Date();
                endsAt.setMonth(endsAt.getMonth() + Number(durationMonths));

                await supabase.from("premium_subscriptions").upsert({
                    seeker_id: seeker.id,
                    status: "ACTIVE",
                    ends_at: endsAt.toISOString(),
                    payment_provider: "PAYCHANGU",
                    payment_reference: reference
                }, { onConflict: "seeker_id" });

                await supabase.from("users").update({ plan: "PREMIUM" }).eq("id", auth.user.id);

                return NextResponse.json({
                    success: true,
                    verified: true,
                    message: "Payment verified and Premium subscription activated!",
                    endsAt: endsAt.toISOString()
                });
            }

            return NextResponse.json({
                success: false,
                verified: false,
                message: "Payment verification pending or invalid reference."
            });
        }

        // ACTION 3: Update WhatsApp Preferences
        if (action === "UPDATE_PREFERENCES") {
            if (phone) {
                await supabase.from("job_seekers").update({ phone }).eq("id", seeker.id);
            }

            await supabase.from("notification_preferences").upsert({
                seeker_id: seeker.id,
                whatsapp_enabled: whatsappEnabled !== undefined ? whatsappEnabled : true,
                min_match_score: minMatchScore || 60,
                frequency: "INSTANT",
                updated_at: new Date().toISOString()
            }, { onConflict: "seeker_id" });

            return NextResponse.json({ success: true, message: "WhatsApp notification preferences updated" });
        }

        // ACTION 4: Cancel Subscription
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
