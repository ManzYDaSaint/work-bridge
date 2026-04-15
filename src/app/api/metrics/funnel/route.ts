import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

const STAGES = [
    "visit",
    "register",
    "onboarding",
    "apply",
    "hire",
] as const;

export async function GET() {
    const auth = await validateAuth(["ADMIN"]);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();
    const adminClient = getSupabaseAdminClient();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    if (!adminClient) {
        return NextResponse.json({ error: "Admin client not available" }, { status: 503 });
    }

    const { data, error } = await adminClient
        .from("product_events")
        .select("role, stage, variant, user_id, session_id")
        .gte("created_at", since);

    if (error) {
        return NextResponse.json({ error: "Could not load funnel data" }, { status: 500 });
    }

    const uniqueByStageRole = new Map<string, Set<string>>();
    const variantMap = new Map<string, Set<string>>();

    for (const row of data || []) {
        const identity = row.user_id || row.session_id;
        if (!identity || !row.stage) continue;

        const role = row.role || "UNKNOWN";
        const key = `${role}:${row.stage}`;
        if (!uniqueByStageRole.has(key)) uniqueByStageRole.set(key, new Set());
        uniqueByStageRole.get(key)!.add(identity);

        const variantKey = row.variant || "none";
        if (!variantMap.has(variantKey)) variantMap.set(variantKey, new Set());
        variantMap.get(variantKey)!.add(identity);
    }

    const roles = ["JOB_SEEKER", "EMPLOYER", "UNKNOWN"];
    const funnel = roles.map((role) => ({
        role,
        stages: STAGES.map((stage) => ({
            stage,
            users: uniqueByStageRole.get(`${role}:${stage}`)?.size || 0,
        })),
    }));

    const variants = Array.from(variantMap.entries()).map(([variant, set]) => ({
        variant,
        users: set.size,
    }));

    return NextResponse.json({
        window: "30d",
        funnel,
        variants,
    });
}
