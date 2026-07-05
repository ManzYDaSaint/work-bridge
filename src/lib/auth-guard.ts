import { createSupabaseServerClient } from "./supabase-server";
import { getSupabaseAdminClient } from "./supabase-admin";
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

    // Use getUser() for secure authentication (validates with Auth server).
    const getUserRes = await supabase.auth.getUser();
    let user = getUserRes.data.user;

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
            // Continue to error handling below.
        }

        if (!user) {
            return {
                userId: "",
                role: "JOB_SEEKER",
                user: null,
                error: NextResponse.json({ error: "Unauthorized access detected. Please sign in." }, { status: 401 })
            };
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

    // Fetch the user role from our public.users table.
    // Use the service-role client to bypass RLS — identity is already
    // cryptographically verified by supabase.auth.getUser() above.
    const adminClient = getSupabaseAdminClient();
    const profileClient = adminClient ?? supabase;
    const { data: profile, error: profileError } = await profileClient
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
        console.error("[AUTH_GUARD] Profile lookup failed for user", user.id, profileError?.message);
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

export type AuthRouteHandler<T extends any[] = any[]> = (
    request: Request,
    auth: AuthValidationResult,
    ...args: T
) => Promise<NextResponse>;

export function withAuth<T extends any[]>(
    handler: AuthRouteHandler<T>,
    allowedRoles?: UserRole[],
    requireMFA: boolean = false,
    requireApprovedEmployer: boolean = false
) {
    return async (request: Request, ...args: T): Promise<NextResponse> => {
        const auth = await validateAuth(allowedRoles, requireMFA, requireApprovedEmployer);
        if (auth.error) return auth.error;
        return handler(request, auth, ...args);
    };
}

export async function requireAuth(
    allowedRoles?: UserRole[],
    requireMFA: boolean = false,
    requireApprovedEmployer: boolean = false
): Promise<AuthValidationResult> {
    const auth = await validateAuth(allowedRoles, requireMFA, requireApprovedEmployer);
    if (auth.error) {
        throw new Error("Unauthorized");
    }
    return auth;
}

/**
 * Attempts to validate auth but returns a neutral result when unauthenticated.
 * Useful for endpoints that optionally use the current user if available.
 */
export async function getAuthOptional(): Promise<AuthValidationResult> {
    const auth = await validateAuth();
    if (auth.error) {
        return {
            userId: "",
            role: "JOB_SEEKER",
            user: null
        };
    }
    return auth;
}
