import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const auth = await validateAuth(['ADMIN'], true);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");
        const userId = searchParams.get("userId");
        const action = searchParams.get("action");

        let query = supabase
            .from("audit_logs")
            .select(`
                *,
                user:users(email, role)
            `, { count: "exact" })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (userId) query = query.eq("user_id", userId);
        if (action) query = query.ilike("action", `%${action}%`);

        const { data: items, count, error } = await query;

        if (error) throw error;

        return NextResponse.json({
            items: items.map((item: any) => ({
                id: item.id,
                action: item.action,
                path: item.path,
                method: item.method,
                statusCode: item.status_code,
                createdAt: item.created_at,
                userId: item.user_id,
                user: item.user
            })),
            total: count || 0,
            limit,
            offset
        });
    } catch (error) {
        console.error("Admin audit fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
    }
}
