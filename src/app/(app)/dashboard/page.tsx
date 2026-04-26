import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function DashboardRedirect() {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Direct database check for role (Server Component)
    const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    // Redirection is primarily handled by the middleware (src/middleware.ts).
    // This server component acts as a safety fallback.
    if (profile) {
        redirect(`/dashboard/${profile.role === "ADMIN" ? "admin" : profile.role === "EMPLOYER" ? "employer" : "seeker"}`);
    }

    // Fallback if profile doesn't exist yet — redirect to login with an error
    // hint rather than showing an infinite spinner.
    redirect("/login?error=no_profile");
}
