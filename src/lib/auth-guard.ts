import { createSupabaseServerClient } from "./supabase-server";
import { NextResponse } from "next/server";
import { UserRole } from "@/types";

/**
 * Result of the authentication validation.
 */
export interface AuthValidationResult {
    userId: string;
    role: UserRole;
    user: any; // The full user object from Supabase
    error?: NextResponse;
}

/**
 * Validates the current session and optionally checks for specific roles and MFA status.
 * 
 * @param allowedRoles - Optional array of roles allowed to access the resource.
 * @param requireMFA - If true, ensures the session is AAL2 (MFA verified).
 * @returns An object containing user details or a pre-formatted NextResponse error.
 */
export async function validateAuth(
    allowedRoles?: UserRole[],
    requireMFA: boolean = false
): Promise<AuthValidationResult> {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            userId: "",
            role: "JOB_SEEKER",
            user: null,
            error: NextResponse.json({ error: "Unauthorized access detected. Please sign in." }, { status: 401 })
        };
    }

    // Check MFA Assurance Level if required
    if (requireMFA) {
        const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

        if (aalError || aal.currentLevel !== 'aal2') {
            return {
                userId: user.id,
                role: "JOB_SEEKER",
                user,
                error: NextResponse.json({
                    error: "MFA Authentication Required. This operation requires a higher security clearance (AAL2).",
                    code: "MFA_REQUIRED"
                }, { status: 403 })
            };
        }
    }

    // Fetch the user role from our public.users table
    const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
        return {
            userId: user.id,
            role: "JOB_SEEKER",
            user,
            error: NextResponse.json({ error: "User identity verification failed. Profile not found." }, { status: 403 })
        };
    }

    const role = profile.role as UserRole;

    // Check if the role is allowed
    if (allowedRoles && !allowedRoles.includes(role)) {
        return {
            userId: user.id,
            role,
            user,
            error: NextResponse.json({
                error: `Access Denied. Required authorization levels: [${allowedRoles.join(", ")}]. Current: [${role}].`
            }, { status: 403 })
        };
    }

    return {
        userId: user.id,
        role,
        user
    };
}
