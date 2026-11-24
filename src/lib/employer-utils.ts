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

/**
 * Resolves the primary employer profile ID for the Aganyu system recruiter account (jobs@aganyu.com).
 * Falls back to finding an employer owned by an ADMIN if the recruiter user is not found.
 */
export async function getSystemRecruiterEmployerId(): Promise<string | null> {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return null;

    // 1. Check if an employer exists with company_name Aganyu or user email jobs@aganyu.com
    const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("email", "jobs@aganyu.com")
        .maybeSingle();

    if (user?.id) {
        const empId = await getEmployerIdForUser(user.id);
        if (empId) return empId;
    }

    // 2. Direct lookup in employers for Aganyu
    const { data: aganyuEmp } = await supabase
        .from("employers")
        .select("id")
        .ilike("company_name", "Aganyu%")
        .maybeSingle();

    if (aganyuEmp?.id) return aganyuEmp.id;

    // 3. Fallback to any ADMIN user's employer profile
    const { data: adminUser } = await supabase
        .from("users")
        .select("id")
        .eq("role", "ADMIN")
        .limit(1)
        .maybeSingle();

    if (adminUser?.id) {
        return (await getEmployerIdForUser(adminUser.id)) || adminUser.id;
    }

    return null;
}
