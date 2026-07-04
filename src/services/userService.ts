import { createSupabaseServerClient } from "@/lib/supabase-server";
import { cache } from "react";
import { UserRole } from "@/types";

export interface UserProfile {
    user: any;
    jobSeeker?: any;
    employer?: any;
}

/**
 * User Service handles all identity and profile data access.
 */
export const userService = {
    /**
     * Fetch a comprehensive user profile including role-specific data.
     */
    getProfile: cache(async (userId: string) => {
        const supabase = await createSupabaseServerClient();
        
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("id", userId)
            .single();

        if (userError) {
            console.error("userService.getProfile (user) error:", userError);
            throw new Error("User not found");
        }

        // Parallel fetch for role-specific profiles
        const [seekerData, employerData] = await Promise.all([
            supabase.from("job_seekers").select("*").eq("id", userId).single(),
            supabase.from("employers").select("*").eq("id", userId).single(),
        ]);

        return {
            user,
            jobSeeker: seekerData.data,
            employer: employerData.data,
        };
    }),

    /**
     * Update profile details based on role.
     */
    updateProfile: async (userId: string, role: UserRole, updates: any) => {
        const supabase = await createSupabaseServerClient();
        const table = role === "JOB_SEEKER" ? "job_seekers" : "employers";
        
        const { data, error } = await supabase
            .from(table)
            .update(updates)
            .eq("id", userId)
            .select()
            .single();

        if (error) {
            console.error(`userService.updateProfile (${table}) error:`, error);
            throw error;
        }
        return data;
    },

    /**
     * Fetch account closure requests.
     */
    getAccountClosureRequests: cache(async (filters: { status?: string; limit?: number; offset?: number }) => {
        const supabase = await createSupabaseServerClient();
        const limit = filters.limit || 50;
        const offset = filters.offset || 0;

        let query = supabase
            .from("account_close_requests")
            .select("*, company_name:employers(company_name)")
            .order("created_at", { ascending: false });

        if (filters.status) {
            query = query.eq("status", filters.status);
        }

        const { data, error, count } = await query
            .range(offset, offset + limit - 1);

        if (error) {
            console.error("userService.getAccountClosureRequests error:", error);
            throw new Error("Failed to fetch closure requests");
        }

        return {
            items: data || [],
            total: count || 0
        };
    }),

    /**
     * Update the status of a closure request.
     */
    updateAccountClosureStatus: async (requestId: string, status: string) => {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase
            .from("account_close_requests")
            .update({ status })
            .eq("id", requestId)
            .select()
            .single();

        if (error) {
            console.error("userService.updateAccountClosureStatus error:", error);
            throw error;
        }
        return data;
    },

    /**
     * Hard delete a user and associated data.
     */
    deleteUser: async (userId: string) => {
        const supabase = await createSupabaseServerClient();
        
        // Depending on DB FK constraints (ON DELETE CASCADE), 
        // we might only need to delete from 'users'
        const { error } = await supabase
            .from("users")
            .delete()
            .eq("id", userId);

        if (error) {
            console.error("userService.deleteUser error:", error);
            throw error;
        }
        return { success: true };
    }
};
