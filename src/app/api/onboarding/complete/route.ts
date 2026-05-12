import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST() {
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
        .from("users")
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq("id", auth.userId);

    if (error) {
        return NextResponse.json({ error: "Failed to complete onboarding" }, { status: 500 });
    }

    // Clear caches for dashboard routes so they fetch the fresh profile
    revalidatePath("/dashboard", "layout");
    revalidatePath("/(app)/dashboard", "layout");

    return NextResponse.json({ success: true });
}
