import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from("users")
        .select("email_preferences")
        .eq("id", auth.userId)
        .single();

    if (error) {
        console.error("Preferences GET error:", error);
        return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
    }

    const defaultPreferences = {
        marketing: true,
        job_alerts: true,
        application_updates: true,
        weekly_digest: true
    };

    return NextResponse.json(data?.email_preferences || defaultPreferences);
}

export async function PUT(request: Request) {
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    try {
        const body = await request.json();
        const supabase = await createSupabaseServerClient();

        const { error } = await supabase
            .from("users")
            .update({ email_preferences: body })
            .eq("id", auth.userId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Preferences PUT error:", error);
        return NextResponse.json({ error: error.message || "Failed to update preferences" }, { status: 500 });
    }
}
