import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { withAudit } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET() {
    const auth = await validateAuth(["ADMIN"], false);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from("account_close_requests")
        .select(`
            id,
            user_id,
            company_name,
            reasons,
            additional_notes,
            status,
            created_at
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Close requests GET error:", error);
        return NextResponse.json({ error: "Failed to fetch close requests." }, { status: 500 });
    }

    return NextResponse.json(data || []);
}

export const PATCH = withAudit(async (request: Request) => {
    const auth = await validateAuth(["ADMIN"], false);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const { id, status } = await request.json();

        const { error } = await supabase
            .from("account_close_requests")
            .update({ status })
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: "Failed to update request." }, { status: 500 });
    }
}, "ADMIN_ACTION_CLOSE_REQUEST");
