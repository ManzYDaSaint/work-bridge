import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/dashboard";

    if (code) {
        const supabase = await createSupabaseServerClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // After email confirmation, ensure the user's profile row exists.
            // The /api/register call at signup is skipped when email confirmation
            // is required (Supabase returns an unconfirmed placeholder user).
            // This is the guaranteed moment the real user exists in auth.users.
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (user) {
                    const adminClient = getSupabaseAdminClient();
                    if (adminClient) {
                        // Check if profile already exists (e.g. email confirm disabled)
                        const { data: existing } = await adminClient
                            .from("users")
                            .select("id")
                            .eq("id", user.id)
                            .maybeSingle();

                        if (!existing) {
                            // Profile missing — create it now using metadata saved at signup
                            const role = (user.user_metadata?.role as string) || "JOB_SEEKER";
                            await adminClient.from("users").upsert({
                                id: user.id,
                                email: user.email,
                                role,
                            });

                            // Create role-specific profile row
                            if (role === "JOB_SEEKER") {
                                await adminClient.from("job_seekers").upsert({
                                    id: user.id,
                                    full_name: user.email?.split("@")[0] ?? "",
                                    location: "To be updated",
                                });
                            } else if (role === "EMPLOYER") {
                                await adminClient.from("employers").upsert({
                                    id: user.id,
                                    company_name: "New Company",
                                    industry: "To be updated",
                                    location: "To be updated",
                                    status: "PENDING",
                                    recruiter_verified: false,
                                });
                            }
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
