import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET(request: Request) {
    const auth = await validateAuth(["ADMIN"], false);
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
        return NextResponse.json({ error: "Admin DB unavailable" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const { data, error } = await supabase
        .from("seeker_domain_overrides")
        .select(`
            id,
            seeker_id,
            old_domain_id,
            new_domain_id,
            changed_at,
            change_source,
            job_seekers(full_name),
            old_domain:qualification_domains!seeker_domain_overrides_old_domain_id_fkey(name),
            new_domain:qualification_domains!seeker_domain_overrides_new_domain_id_fkey(name)
        `)
        .order("changed_at", { ascending: false })
        .limit(limit);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ overrides: data || [] });
}

export const dynamic = "force-dynamic";
