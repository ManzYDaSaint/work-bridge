import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { recordAuditLog } from "@/lib/audit";
import { NextResponse } from "next/server";

export async function GET() {
    const auth = await validateAuth(['ADMIN'], true);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const { data: employers, error } = await supabase
            .from("employers")
            .select("*")
            .order('company_name', { ascending: true });

        if (error) throw error;

        // Camelize response
        const formattedEmployers = employers.map(e => ({
            id: e.id,
            companyName: e.company_name,
            industry: e.industry,
            location: e.location,
            status: e.status || 'PENDING',
            website: e.website,
            description: e.description,
            createdAt: e.created_at
        }));

        return NextResponse.json(formattedEmployers);
    } catch (error) {
        console.error("Admin employers fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch employers" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const auth = await validateAuth(['ADMIN'], true);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const { employerId, status, notes } = await request.json();
        const { user } = auth;

        const { error } = await supabase
            .from("employers")
            .update({ status })
            .eq("id", employerId);

        if (error) throw error;

        // Record Audit Log
        await recordAuditLog({
            action: `EMPLOYER_VERIFICATION_${status}`,
            path: "/api/admin/employers",
            method: "PATCH",
            statusCode: 200,
            userId: user.id,
            metadata: { employerId, status, notes }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Admin employer update error:", error);
        return NextResponse.json({ error: "Update failed", details: (error as any)?.message }, { status: 500 });
    }
}
