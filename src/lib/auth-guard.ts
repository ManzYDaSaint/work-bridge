import { createSupabaseServerClient } from "./supabase-server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
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
 * Validates the current session and optionally checks for specific roles, MFA status, and Employer approval.
 * 
 * @param allowedRoles - Optional array of roles allowed to access the resource.
 * @param requireMFA - If true, ensures the session is AAL2 (MFA verified).
 * @param requireApprovedEmployer - If true, ensures the employer's status is 'APPROVED'.
 * @returns An object containing user details or a pre-formatted NextResponse error.
 */
export async function validateAuth(
    allowedRoles?: UserRole[],
    requireMFA: boolean = false,
    requireApprovedEmployer: boolean = false
): Promise<AuthValidationResult> {
    const supabase = await createSupabaseServerClient();

    // Prefer local cookie session to avoid an Auth API call on every route hit.
    // Fallback to `getUser()` only when session is absent/stale.
    const { data: { session } } = await supabase.auth.getSession();
    let user = session?.user ?? null;

    if (!user) {
        // If cookies are missing on this request (rare dev cross-origin cases),
        // accept Authorization: Bearer <access_token> from apiFetch.
        try {
            const h = await headers();
            const raw = h.get("authorization") ?? h.get("Authorization");
            if (raw?.toLowerCase().startsWith("bearer ")) {
                const token = raw.slice(7).trim();
                if (token) {
                    const { data: { user: fromBearer } } = await supabase.auth.getUser(token);
                    if (fromBearer) user = fromBearer;
                }
            }
        } catch {
            // Continue to cookie-based fallback below.
        }

        if (!user) {
            const { data: { user: fetched }, error: authError } = await supabase.auth.getUser();
            if (authError || !fetched) {
                return {
                    userId: "",
                    role: "JOB_SEEKER",
                    user: null,
                    error: NextResponse.json({ error: "Unauthorized access detected. Please sign in." }, { status: 401 })
                };
            }
            user = fetched;
        }
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

    // Check Employer Approval if required
    if (requireApprovedEmployer && role === "EMPLOYER") {
        const { data: employer, error: employerError } = await supabase
            .from("employers")
            .select("status")
            .eq("id", user.id)
            .single();

        if (employerError || employer?.status !== 'APPROVED') {
            return {
                userId: user.id,
                role,
                user,
                error: NextResponse.json({
                    error: "Verification Pending. Your corporate account is currently being audited by our trust team.",
                    code: "EMPLOYER_PENDING"
                }, { status: 403 })
            };
        }
    }

    return {
        userId: user.id,
        role,
        user
    };
}
