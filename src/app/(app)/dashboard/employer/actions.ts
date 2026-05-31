"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { recordAuditLog } from "@/lib/audit";
import { validateAuth } from "@/lib/auth-guard";

/**
 * Requests a profile reveal from a job seeker.
 */
export async function requestProfileReveal(seekerId: string) {
    const auth = await validateAuth(["EMPLOYER"], false, true);
    if (auth.error || !auth.user) {
        throw new Error("Unauthorized");
    }

    const supabase = await createSupabaseServerClient();

    try {
        const { data, error } = await supabase
            .from("profile_reveals")
            .insert([{
                employer_id: auth.user.id,
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

        await recordAuditLog({
            action: "PROFILE_REVEAL_REQUESTED",
            path: "/dashboard/employer",
            method: "SERVER_ACTION",
            statusCode: 200,
            userId: auth.user.id,
            metadata: { seekerId, revealId: data.id }
        });

        return { success: true };

    } catch (err) {
        console.error("[Request Reveal] Error:", err);
        return { error: "Failed to request reveal. Please try again." };
    }
}
