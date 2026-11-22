import { validateAuth } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const auth = await validateAuth(["ADMIN"], false);
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
        return NextResponse.json({ error: "Database client unavailable" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || "").trim();

    try {
        let dbQuery = supabase
            .from("employers")
            .select(`
                id,
                company_name,
                industry,
                location,
                website,
                account_type,
                recruitment_email,
                recruitment_url,
                status
            `)
            .order("company_name", { ascending: true })
            .limit(20);

        if (query) {
            dbQuery = dbQuery.ilike("company_name", `%${query}%`);
        }

        const { data: employers, error } = await dbQuery;
        if (error) throw error;

        return NextResponse.json({ employers: employers || [] });
    } catch (err: any) {
        console.error("[Admin Employers Search] Error:", err);
        return NextResponse.json({ error: err.message || "Failed to search employers" }, { status: 500 });
    }
}
