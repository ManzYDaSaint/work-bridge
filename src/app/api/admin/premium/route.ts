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

        // 1. Fetch all premium subscriptions
        const { data: subs, error: subsError } = await supabase
            .from("premium_subscriptions")
            .select("id, seeker_id, status, ends_at, payment_provider, payment_reference, created_at")
            .order("created_at", { ascending: false });

        if (subsError) {
            console.error("[api/admin/premium] Error fetching subscriptions:", subsError);
        }

        const rawSubs = subs || [];
        const seekerIds = Array.from(new Set(rawSubs.map(s => s.seeker_id).filter(Boolean)));

        // 2. Fetch corresponding job_seekers & users in parallel
        let seekersMap: Record<string, any> = {};
        let usersMap: Record<string, any> = {};

        if (seekerIds.length > 0) {
            const [{ data: seekerList }, { data: userList }] = await Promise.all([
                supabase.from("job_seekers").select("id, full_name, phone, qualification").in("id", seekerIds),
                supabase.from("users").select("id, email, plan").in("id", seekerIds),
            ]);

            (seekerList || []).forEach(s => { seekersMap[s.id] = s; });
            (userList || []).forEach(u => { usersMap[u.id] = u; });
        }

        // 3. Attach seeker and user profile objects
        const allSubs = rawSubs.map(s => {
            const seekerObj = seekersMap[s.seeker_id] || null;
            const userObj = usersMap[s.seeker_id] || null;
            return {
                ...s,
                job_seekers: seekerObj ? {
                    ...seekerObj,
                    users: userObj,
                } : null,
            };
        });

        // Fetch subscription payments ledger if table exists
        let payments: any[] = [];
        try {
            const { data: payData } = await supabase
                .from("subscription_payments")
                .select("id, subscription_id, amount, currency, status, provider_reference, created_at")
                .order("created_at", { ascending: false });
            payments = payData || [];
        } catch (e) {
            console.warn("[api/admin/premium] subscription_payments fetch fallback:", e);
        }

        const active = allSubs.filter(s => s.status === "ACTIVE" && new Date(s.ends_at) > new Date());
        const expiringSoon = active.filter(s => new Date(s.ends_at) <= new Date(sevenDaysFromNow));
        const expired = allSubs.filter(s => s.status === "ACTIVE" && new Date(s.ends_at) <= new Date());
        const cancelled = allSubs.filter(s => s.status === "CANCELLED");
        const adminGranted = allSubs.filter(s => s.payment_provider === "ADMIN_MANUAL");
        const paidSubs = allSubs.filter(s => s.payment_provider && s.payment_provider !== "ADMIN_MANUAL");

        // Calculate Revenue Telemetry
        const paidPayments = payments.filter(p => p.status === "PAID");
        const totalRevenueFromPayments = paidPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
        
        // Fallback revenue calculation if ledger records were registered before subscription_payments table was attached
        const estimatedPaidSubsCount = paidSubs.length;
        const estimatedRevenueFromSubs = estimatedPaidSubsCount * 1000; // MWK 1,000 / month standard rate
        
        // Dynamic combined total gross revenue (ledger takes priority if populated)
        const totalGrossRevenue = totalRevenueFromPayments > 0 ? totalRevenueFromPayments : estimatedRevenueFromSubs;
        
        // Estimated Monthly Recurring Revenue (MRR) from active paid subscriptions
        const activePaidCount = active.filter(s => s.payment_provider && s.payment_provider !== "ADMIN_MANUAL").length;
        const mrr = activePaidCount * 1000;

        // Payment breakdown by provider
        const providerBreakdown = allSubs.reduce((acc: Record<string, number>, s) => {
            const key = s.payment_provider || "UNSPECIFIED";
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        // Attach recent transactions enriched with seeker metadata
        const recentTransactions = paidPayments.map(p => {
            const sub = allSubs.find(s => s.id === p.subscription_id);
            return {
                ...p,
                seeker: sub?.job_seekers || null
            };
        });

        return NextResponse.json({
            stats: {
                totalActive: active.length,
                expiringSoon: expiringSoon.length,
                expired: expired.length,
                cancelled: cancelled.length,
                adminGranted: adminGranted.length,
                paidSubs: paidSubs.length,
                totalGrossRevenue,
                mrr,
                currency: "MWK",
                providerBreakdown
            },
            active,
            expiringSoon,
            expired,
            cancelled,
            recentTransactions,
            all: allSubs
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
