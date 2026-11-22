import { getSupabaseAdminClient } from "@/lib/supabase-admin";

/**
 * Resolves the primary employer profile ID for a user.
 * Supports both legacy direct ID match (id = userId) and decoupled user_id column.
 */
export async function getEmployerIdForUser(userId: string): Promise<string | null> {
    if (!userId) return null;
    const supabase = getSupabaseAdminClient();
    if (!supabase) return null;

    const { data } = await supabase
        .from("employers")
        .select("id")
        .or(`user_id.eq.${userId},id.eq.${userId}`)
        .maybeSingle();

    return data?.id ?? null;
}
