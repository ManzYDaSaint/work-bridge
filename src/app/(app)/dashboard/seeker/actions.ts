"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { verifyCertificateWithOCR } from "@/lib/ai";
import { sendRevealResponseEmail } from "@/lib/resend";
import { recordAuditLog } from "@/lib/audit";

/**
 * Uploads a certificate PDF, runs OCR verification, and updates the seeker's verification status.
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

    // 1. Get Seeker's full name for verification
    const { data: seeker, error: seekerError } = await supabase
        .from("job_seekers")
        .select("full_name")
        .eq("id", user.id)
        .single();

    if (seekerError || !seeker) {
        return { error: "Could not retrieve seeker profile." };
    }

    try {
        // 2. Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 3. Run AI Verification
        const verification = await verifyCertificateWithOCR(buffer, seeker.full_name);

        // 4. Store Certificate in Database
        const { data: cert, error: certError } = await supabase
            .from("certificates")
            .insert([{
                seeker_id: user.id,
                title: title || verification.qualification,
                issuer: issuer || "Auto-detected",
                is_verified: verification.isNameVerified,
                verification_tier: verification.tier,
                verification_confidence: verification.confidence,
                verification_summary: verification.summary
            }])
            .select()
            .single();

        if (certError) throw certError;

        // 5. Update Seeker's top verification tier if this one is higher
        if (verification.isNameVerified) {
            const { data: currentSeeker } = await supabase
                .from("job_seekers")
                .select("top_verification_tier")
                .eq("id", user.id)
                .single();

            if (verification.tier > (currentSeeker?.top_verification_tier ?? -1)) {
                await supabase
                    .from("job_seekers")
                    .update({ top_verification_tier: verification.tier })
                    .eq("id", user.id);
            }
        }

        revalidatePath("/dashboard/seeker");
        return { success: true, verification };

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
            .eq("seeker_id", user.id) // Security check
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

        // Trigger Notification
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

        // Audit Log
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
 * Initializes a Flutterwave payment for Premium Verification.
 */
export async function initializeVerificationPayment() {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const tx_ref = `wb-verif-${Date.now()}-${user.id.slice(0, 8)}`;

    try {
        // In a real app, you'd call Flutterwave API here to get a payment link.
        // For MVP, we'll return the configuration for the Flutterwave standard checkout.

        return {
            success: true,
            config: {
                public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || "FLWPUBK_TEST-SANDBOX-X",
                tx_ref,
                amount: 50, // Premium verification fee
                currency: "USD",
                payment_options: "card,mobilemoney,ussd",
                customer: {
                    email: user.email,
                    name: user.user_metadata?.full_name || "Job Seeker",
                },
                customizations: {
                    title: "WorkBridge Premium Verification",
                    description: "Get the Verified Bio Badge and priority talent discovery.",
                    logo: "https://workbridge.co/logo.png",
                },
                redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/seeker?payment=success&ref=${tx_ref}`,
            }
        };

    } catch (err) {
        console.error("[Payment Init] Error:", err);
        return { error: "Failed to initialize payment gateway." };
    }
}
