import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { buildMeProfile } from "@/lib/me-profile";
import type { User, UserRole } from "@/types";
import { validateAuth } from "@/lib/auth-guard";

/**
 * Server-only: load Supabase auth + app profile the same way RSC and /api/me do.
 * Use in dashboard segment layouts so we never depend on a client /api/me gate.
 */
export async function requireDashboardProfile(expectedRole: UserRole): Promise<{ profile: User }> {
    const auth = await validateAuth([expectedRole]);
    if (auth.error || !auth.user) {
        redirect("/login");
    }

    const supabase = await createSupabaseServerClient();
    const { profile, error } = await buildMeProfile(supabase, auth.user.id);
    if (error === "not_found" || !profile) {
        redirect("/login");
    }

    console.log("[DEBUG auth] Role:", profile.role, "Employer status:", profile.employer?.status);

    if (profile.role !== expectedRole) {
        redirect("/dashboard");
    }

    if (!profile.onboardingComplete) {
        redirect("/onboarding");
    }

    return { profile };
}
