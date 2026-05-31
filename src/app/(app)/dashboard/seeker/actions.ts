"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { sendRevealResponseEmail } from "@/lib/resend";
import { recordAuditLog } from "@/lib/audit";
import { validateAuth } from "@/lib/auth-guard";

/**
 * Responds to a profile reveal request (APPROVE or REJECT).
 */
export async function respondToRevealRequest(revealId: string, status: "APPROVED" | "REJECTED") {
    const auth = await validateAuth(["JOB_SEEKER"]);
    if (auth.error || !auth.user) {
        throw new Error("Unauthorized");
    }

    const supabase = await createSupabaseServerClient();

    try {
        const { data, error } = await supabase
            .from("profile_reveals")
            .update({ status })
            .eq("id", revealId)
            .eq("seeker_id", auth.user.id)
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
            userId: auth.user.id,
            metadata: { revealId, status, employerName }
        });

        revalidatePath("/dashboard/seeker");
        return { success: true };

    } catch (err) {
        console.error("[Respond Reveal] Error:", err);
        return { error: "Failed to update request status." };
    }
}


