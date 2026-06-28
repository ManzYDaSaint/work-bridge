import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { isFreeEmailDomain } from "@/lib/email-safety";
import { sendWelcomeEmail } from "@/lib/resend";

type AuthRole = "JOB_SEEKER" | "EMPLOYER";

function normalizeRequestedRole(role: string | null): AuthRole | null {
    const normalized = role?.toLowerCase();
    if (normalized === "employer") return "EMPLOYER";
    if (normalized === "seeker" || normalized === "job_seeker" || normalized === "candidate") return "JOB_SEEKER";
    return null;
}

function isFreshOAuthUser(createdAt?: string): boolean {
    if (!createdAt) return false;
    const createdTime = new Date(createdAt).getTime();
    if (Number.isNaN(createdTime)) return false;
    return Date.now() - createdTime < 5 * 60 * 1000;
}

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/dashboard";
    const requestedRole = normalizeRequestedRole(searchParams.get("role"));

    if (code) {
        const supabase = await createSupabaseServerClient();
        const { data: authData, error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // After email confirmation or OAuth, ensure the user's public profile rows exist.
            try {
                const user = authData?.user;

                if (user) {
                    const adminClient = getSupabaseAdminClient();
                    if (adminClient) {
                        const { data: existing } = await adminClient
                            .from("users")
                            .select("id, role, created_at")
                            .eq("id", user.id)
                            .maybeSingle();

                        const metadataRole = normalizeRequestedRole(user.user_metadata?.role as string | null);
                        const existingRole = existing?.role as AuthRole | undefined;
                        const canApplyRequestedRole = !existing || isFreshOAuthUser(user.created_at);
                        const effectiveRole = requestedRole && canApplyRequestedRole
                            ? requestedRole
                            : existingRole || metadataRole || "JOB_SEEKER";
                        const email = user.email ?? "";
                        const displayName = user.user_metadata?.full_name || user.user_metadata?.name || email.split("@")[0] || "";

                        await adminClient.from("users").upsert({
                            id: user.id,
                            email,
                            role: effectiveRole,
                        });

                        if (effectiveRole === "JOB_SEEKER") {
                            await adminClient.from("job_seekers").upsert({
                                id: user.id,
                                full_name: displayName,
                                location: "To be updated",
                                avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
                            });

                            if (canApplyRequestedRole) {
                                await adminClient.from("employers").delete().eq("id", user.id);
                            }

                            // Process referral if ref is present.
                            // For OAuth signups the ref param is forwarded explicitly to the callback URL.
                            // For email/password signups Supabase strips query params from the confirmation
                            // redirect, so we fall back to the value stored in user metadata at signup time.
                            const referralCode =
                                searchParams.get("ref") ||
                                (user.user_metadata?.referral_code as string | undefined) ||
                                null;
                            if (referralCode && isFreshOAuthUser(user.created_at)) {
                                const { data: referrer } = await adminClient
                                    .from("job_seekers")
                                    .select("id")
                                    .eq("public_slug", referralCode)
                                    .single();
                                
                                if (referrer) {
                                    const { error: insertErr } = await adminClient.from("referrals").insert({
                                        referrer_id: referrer.id,
                                        referred_id: user.id,
                                        status: "PENDING"
                                    });
                                    if (insertErr && insertErr.code !== "23505") {
                                        console.error("[auth/callback] referral insert error:", insertErr);
                                    }
                                }
                            }
                        } else if (effectiveRole === "EMPLOYER") {
                            await adminClient.from("employers").upsert({
                                id: user.id,
                                company_name: user.user_metadata?.company_name ?? null,
                                industry: null,
                                location: null,
                                status: "PENDING",
                                recruiter_verified: email ? !isFreeEmailDomain(email) : false,
                            });

                            if (canApplyRequestedRole) {
                                await adminClient.from("job_seekers").delete().eq("id", user.id);
                            }
                        }

                        // Send welcome email only on their very first successful login/verification
                        if (!existing && email) {
                            // Execute without blocking the redirect response
                            sendWelcomeEmail(email, displayName).catch(err => 
                                console.error("[auth/callback] welcome email failed:", err)
                            );
                        }
                    }
                }
            } catch (profileErr) {
                // Non-fatal — user can still log in; profile will be created on first dashboard load
                console.error("[auth/callback] profile upsert failed:", profileErr);
            }

            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
