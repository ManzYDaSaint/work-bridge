"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { sendRevealResponseEmail } from "@/lib/resend";
import { recordAuditLog } from "@/lib/audit";
import { createPaymentLink, generateSeekerBadgeRef, generateSeekerPlusRef } from "@/lib/payments";

/**
 * Uploads a certificate PDF for manual review.
 */
export async function uploadAndVerifyCertificate(formData: FormData) {
    const file = formData.get("certificate") as File;
    const title = formData.get("title") as string;
    const issuer = formData.get("issuer") as string;

    if (!file || file.type !== "application/pdf") {
        return { error: "Please upload a valid PDF certificate." };
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    try {
        await file.arrayBuffer();

        const { data: cert, error: certError } = await supabase
            .from("certificates")
            .insert([{
                seeker_id: user.id,
                title: title || file.name,
                issuer: issuer || "Pending review",
                is_verified: false,
                verification_tier: -1,
            }])
            .select()
            .single();

        if (certError) throw certError;

        revalidatePath("/dashboard/seeker");
        return { success: true, certificate: cert };

    } catch (err) {
        console.error("[Upload Certificate] Error:", err);
        return { error: "Failed to process certificate. Please try again." };
    }
}

/**
 * Responds to a profile reveal request (APPROVE or REJECT).
 */
export async function respondToRevealRequest(revealId: string, status: "APPROVED" | "REJECTED") {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    try {
        const { data, error } = await supabase
            .from("profile_reveals")
            .update({ status })
            .eq("id", revealId)
            .eq("seeker_id", user.id)
            .select(`
                *,
                employers (
                    company_name,
                    users!employers_id_fkey (email)
                ),
                job_seekers (
                    full_name
                )
            `)
            .single();

        if (error) throw error;
        if (!data) throw new Error("Request not found or unauthorized.");

        const employerEmail = (data.employers as any)?.users?.email;
        const employerName = (data.employers as any)?.company_name || "Employer";
        const seekerName = (data.job_seekers as any)?.full_name || "A candidate";

        if (employerEmail) {
            await sendRevealResponseEmail(employerEmail, {
                employerName,
                seekerName,
                status
            });
        }

        await recordAuditLog({
            action: `REVEAL_REQUEST_${status}`,
            path: "/dashboard/seeker/actions",
            method: "SERVER_ACTION",
            statusCode: 200,
            userId: user.id,
            metadata: { revealId, status, employerName }
        });

        revalidatePath("/dashboard/seeker");
        return { success: true };

    } catch (err) {
        console.error("[Respond Reveal] Error:", err);
        return { error: "Failed to update request status." };
    }
}

/**
 * Initializes a PayChangu payment for the WorkBridge Badge (one-time fee).
 * First 100 seekers get it free — check hasBadge before calling this.
 */
export async function initializeBadgePayment() {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // Verify the seeker doesn't already have a badge
    const { data: seeker } = await supabase
        .from("job_seekers")
        .select("has_badge, full_name")
        .eq("id", user.id)
        .single();

    if (seeker?.has_badge) {
        return { error: "You already have the WorkBridge Badge." };
    }

    const tx_ref = generateSeekerBadgeRef(user.id);
    const customer_name = seeker?.full_name || user.user_metadata?.full_name || "Job Seeker";

    const payment = await createPaymentLink({
        email: user.email!,
        amount: 3000,
        tx_ref,
        customer_name,
        title: "WorkBridge Badge",
        description: "One-time fee to unlock full platform access and profile updates.",
    });

    if (payment.status === "success" && payment.data?.link) {
        return { success: true, url: payment.data.link };
    }

    return { error: payment.message || "Payment failed to initialize" };
}

/**
 * Initializes a PayChangu payment for the Plus monthly subscription.
 */
export async function initializePlusSubscriptionPayment() {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { data: seeker } = await supabase
        .from("job_seekers")
        .select("is_subscribed, full_name")
        .eq("id", user.id)
        .single();

    if (seeker?.is_subscribed) {
        return { error: "You already have an active Plus subscription." };
    }

    const tx_ref = generateSeekerPlusRef(user.id);
    const customer_name = seeker?.full_name || user.user_metadata?.full_name || "Job Seeker";

    const payment = await createPaymentLink({
        email: user.email!,
        amount: 2000,
        tx_ref,
        customer_name,
        title: "WorkBridge Plus",
        description: "Monthly plan with expanded applications and premium visibility.",
    });

    if (payment.status === "success" && payment.data?.link) {
        return { success: true, url: payment.data.link };
    }

    return { error: payment.message || "Payment failed to initialize" };
}
