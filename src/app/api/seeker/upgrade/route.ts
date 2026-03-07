import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const auth = await validateAuth(["JOB_SEEKER"]);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
        .from("job_seekers")
        .update({ is_subscribed: true })
        .eq("id", auth.userId);

    if (error) {
        return NextResponse.json({ error: "Failed to upgrade" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
