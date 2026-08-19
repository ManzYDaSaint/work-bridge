import { validateAuth } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST() {
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    // Use the service-role admin client to bypass RLS.
    // The public.users table has no UPDATE policy for regular users,
    // so writing onboarding_completed_at requires elevated privileges.
    // Auth is already verified above via validateAuth().
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const { error } = await supabase
        .from("users")
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq("id", auth.userId);

    if (error) {
        console.error("[onboarding/complete] Failed to write onboarding_completed_at:", error);
        return NextResponse.json({ error: "Failed to complete onboarding" }, { status: 500 });
    }

    // Clear caches for dashboard routes so they fetch the fresh profile
    revalidatePath("/dashboard", "layout");
    revalidatePath("/(app)/dashboard", "layout");

    return NextResponse.json({ success: true });
}


export const dynamic = "force-dynamic";
