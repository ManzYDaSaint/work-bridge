import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET() {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
        return NextResponse.json({ error: "Admin client unavailable" }, { status: 500 });
    }

    try {
        const now = new Date().toISOString();
        const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        // All premium subscriptions with seeker info
        const { data: subs } = await supabase
            .from("premium_subscriptions")
            .select(`
                id, status, ends_at, payment_provider, payment_reference, created_at,
                job_seekers (
                    id, full_name, phone, qualification,
                    users ( id, email, plan )
                )
            `)
            .order("created_at", { ascending: false });

        const allSubs = subs || [];

        const active = allSubs.filter(s => s.status === "ACTIVE" && new Date(s.ends_at) > new Date());
        const expiringSoon = active.filter(s => new Date(s.ends_at) <= new Date(sevenDaysFromNow));
        const expired = allSubs.filter(s => s.status === "ACTIVE" && new Date(s.ends_at) <= new Date());
        const cancelled = allSubs.filter(s => s.status === "CANCELLED");
        const adminGranted = allSubs.filter(s => s.payment_provider === "ADMIN_MANUAL");
        const paidSubs = allSubs.filter(s => s.payment_provider && s.payment_provider !== "ADMIN_MANUAL");

        return NextResponse.json({
            stats: {
                totalActive: active.length,
                expiringSoon: expiringSoon.length,
                expired: expired.length,
                cancelled: cancelled.length,
                adminGranted: adminGranted.length,
                paidSubs: paidSubs.length,
            },
            active,
            expiringSoon,
            expired,
            cancelled,
            all: allSubs
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
