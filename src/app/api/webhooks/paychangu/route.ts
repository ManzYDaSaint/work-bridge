import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { PayChanguProvider } from "@/lib/subscription/paychangu-provider";
import { emitSystemEvent } from "@/lib/mission-control";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

async function processPayChanguActivation(targetRef: string, durationMonths: number = 1) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return { success: false, error: "Database client unavailable" };

    const provider = new PayChanguProvider();
    const verification = await provider.verifyPayment(targetRef);

    if (!verification.success) {
        return { success: false, error: "Payment verification failed or pending" };
    }

    // Derive seekerId from tx_ref: format `aganyu_prem_${seekerId}_${timestamp}`
    let finalSeekerId: string | null = null;
    if (targetRef.startsWith("aganyu_prem_")) {
        const prefix = "aganyu_prem_";
        const lastUnderscore = targetRef.lastIndexOf("_");
        if (lastUnderscore > prefix.length) {
            finalSeekerId = targetRef.substring(prefix.length, lastUnderscore);
        } else {
            finalSeekerId = targetRef.substring(prefix.length);
        }
    }

    if (!finalSeekerId) {
        return { success: false, error: "Unable to extract seeker ID from reference" };
    }

    // Lookup seeker profile
    const { data: seeker } = await supabase
        .from("job_seekers")
        .select("id, user_id, phone, full_name")
        .or(`id.eq.${finalSeekerId},user_id.eq.${finalSeekerId}`)
        .maybeSingle();

    const actualSeekerId = seeker?.id || finalSeekerId;

    // Subscription Stacking Logic: calculate endsAt
    const { data: currentSub } = await supabase
        .from("premium_subscriptions")
        .select("ends_at, status")
        .eq("seeker_id", actualSeekerId)
        .eq("status", "ACTIVE")
        .maybeSingle();

    let baseDate = new Date();
    if (currentSub?.ends_at && new Date(currentSub.ends_at) > baseDate) {
        baseDate = new Date(currentSub.ends_at);
    }

    const endsAt = new Date(baseDate);
    endsAt.setMonth(endsAt.getMonth() + Number(durationMonths));

    const { data: subData, error: subErr } = await supabase.from("premium_subscriptions").upsert({
        seeker_id: actualSeekerId,
        status: "ACTIVE",
        ends_at: endsAt.toISOString(),
        payment_provider: "PAYCHANGU",
        payment_reference: targetRef
    }, { onConflict: "seeker_id" }).select("id").maybeSingle();

    if (subErr) {
        console.error("[PayChangu Webhook] premium_subscriptions upsert error:", subErr);
    }

    let subscriptionId = subData?.id;
    if (!subscriptionId) {
        const { data: existingSub } = await supabase
            .from("premium_subscriptions")
            .select("id")
            .eq("seeker_id", actualSeekerId)
            .maybeSingle();
        subscriptionId = existingSub?.id;
    }

    if (subscriptionId) {
        const { error: paymentErr } = await supabase.from("subscription_payments").insert({
            subscription_id: subscriptionId,
            amount: verification.amount || (500 * Number(durationMonths)),
            currency: "MWK",
            status: "PAID",
            provider_reference: targetRef
        });
        if (paymentErr) {
            console.error("[PayChangu Webhook] Failed to insert subscription_payments record:", paymentErr);
        }
    }

    if (seeker?.user_id) {
        await supabase.from("users").update({ plan: "PREMIUM" }).eq("id", seeker.user_id);
    }

    // Trigger WhatsApp welcome alert if phone number exists
    if (seeker?.phone) {
        try {
            const { sendWhatsAppTemplate } = await import("@/lib/notification/worker");
            await sendWhatsAppTemplate(seeker.phone, "hello_world", {
                languageCode: "en_US"
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
        metadata: { reference: targetRef, seekerId: actualSeekerId, amount: verification.amount }
    });

    return { success: true, endsAt: endsAt.toISOString() };
}

/**
 * OPTIONS Handler: Allows preflight CORS requests from PayChangu checkout widget
 */
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
    });
}

/**
 * GET Handler: Handles both AJAX polling from PayChangu JS widget and browser redirects
 */
export async function GET(request: Request) {
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://aganyu.com";
    const { searchParams } = new URL(request.url);
    const targetRef = searchParams.get("tx_ref") || searchParams.get("reference") || searchParams.get("txRef");
    const status = searchParams.get("status");

    // Check if request is an AJAX/Fetch request from PayChangu's JS widget
    const acceptHeader = request.headers.get("accept") || "";
    const fetchMode = request.headers.get("sec-fetch-mode") || "";
    const isAjax = acceptHeader.includes("application/json") || fetchMode === "cors";

    if (!targetRef) {
        if (isAjax) {
            return NextResponse.json({ status: "failed", error: "Missing reference" }, { status: 400, headers: corsHeaders });
        }
        return NextResponse.redirect(`${siteUrl}/dashboard/seeker/subscription?status=failed`);
    }

    if (status === "cancelled" || status === "failed" || status === "declined") {
        if (isAjax) {
            return NextResponse.json({ status, message: "Payment cancelled" }, { status: 200, headers: corsHeaders });
        }
        return NextResponse.redirect(`${siteUrl}/dashboard/seeker/subscription?reference=${targetRef}&status=${status}`);
    }

    const result = await processPayChanguActivation(targetRef);

    if (isAjax) {
        return NextResponse.json({
            status: result.success ? "success" : "failed",
            message: result.success ? "Payment verified and activated" : result.error
        }, { status: 200, headers: corsHeaders });
    }

    const redirectStatus = result.success ? "success" : "failed";
    return NextResponse.redirect(`${siteUrl}/dashboard/seeker/subscription?reference=${targetRef}&status=${redirectStatus}`);
}

/**
 * POST Handler: PayChangu server-to-server webhook notification
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const targetRef = body.tx_ref || body.reference || body.data?.tx_ref;

        if (!targetRef) {
            return NextResponse.json({ error: "Transaction reference missing" }, { status: 400, headers: corsHeaders });
        }

        const result = await processPayChanguActivation(targetRef);

        if (result.success) {
            return NextResponse.json({ status: "success", message: "Subscription activated", endsAt: result.endsAt }, { status: 200, headers: corsHeaders });
        }

        return NextResponse.json({ status: "ignored", message: result.error || "Payment not verified" }, { status: 200, headers: corsHeaders });
    } catch (error: any) {
        console.error("[PayChangu Webhook Error]:", error);
        return NextResponse.json({ error: error.message || "Webhook processing failed" }, { status: 500, headers: corsHeaders });
    }
}

export const dynamic = "force-dynamic";
