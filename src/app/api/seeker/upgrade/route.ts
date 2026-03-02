import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
        .from("job_seekers")
        .update({ is_subscribed: true })
        .eq("id", user.id);

    if (error) {
        return NextResponse.json({ error: "Failed to upgrade" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
