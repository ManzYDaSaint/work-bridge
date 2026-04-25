import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const auth = await validateAuth(['JOB_SEEKER']);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const [seekerRes, transactionsRes] = await Promise.all([
            supabase.from("job_seekers").select("is_subscribed, has_badge").eq("id", auth.userId).single(),
            supabase.from("transactions").select("*").eq("user_id", auth.userId).order("created_at", { ascending: false })
        ]);

        if (seekerRes.error) throw seekerRes.error;
        if (transactionsRes.error) {
            console.error("Transactions fetch error:", transactionsRes.error);
        }

        return NextResponse.json({
            isSubscribed: seekerRes.data.is_subscribed || false,
            hasBadge: seekerRes.data.has_badge || false,
            transactions: transactionsRes.data || []
        });
    } catch (error: any) {
        console.error("Seeker Billing GET error:", error);
        return NextResponse.json({ error: "Failed to fetch billing info" }, { status: 500 });
    }
}
