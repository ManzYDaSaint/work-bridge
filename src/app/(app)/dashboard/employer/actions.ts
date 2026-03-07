"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { recordAuditLog } from "@/lib/audit";

/**
 * Requests a profile reveal from a job seeker.
 */
export async function requestProfileReveal(seekerId: string) {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // 1. Get Employer profile
    const { data: employer, error: employerError } = await supabase
        .from("employers")
        .select("id, status")
        .eq("id", user.id)
        .single();

    if (employerError || !employer) {
        return { error: "Employer profile not found." };
    }

    if (employer.status !== 'APPROVED') {
        return { error: "Verification Pending. Only approved corporate accounts can request full profile reveals." };
    }

    try {
        const { data, error } = await supabase
            .from("profile_reveals")
            .insert([{
                employer_id: employer.id,
                seeker_id: seekerId,
                status: "PENDING"
            }])
            .select()
            .single();

        if (error) {
            if (error.code === "23505") return { error: "Reveal already requested." };
            throw error;
        }

        revalidatePath("/dashboard/employer");

        // Explicit business-logic audit
        await recordAuditLog({
            action: "PROFILE_REVEAL_REQUESTED",
            path: "/dashboard/employer",
            method: "SERVER_ACTION",
            statusCode: 200,
            userId: user.id,
            metadata: { seekerId, revealId: data.id }
        });

        return { success: true };

    } catch (err) {
        console.error("[Request Reveal] Error:", err);
        return { error: "Failed to request reveal. Please try again." };
    }
}
