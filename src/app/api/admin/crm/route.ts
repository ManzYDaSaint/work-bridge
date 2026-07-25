import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { validateAuth } from "@/lib/auth-guard";

const CRM_STATUSES = new Set(["LEAD", "REGISTERED", "VERIFICATION_PENDING", "VERIFIED", "ACTIVE", "INACTIVE", "CHURNED"]);

export async function PATCH(request: Request) {
    const auth = await validateAuth(["ADMIN"], false);
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdminClient();
    if (!supabase) return new NextResponse("Admin client missing", { status: 500 });

    const { id, status } = await request.json();
    if (!id || !CRM_STATUSES.has(status)) {
        return NextResponse.json({ error: "A valid CRM profile id and status are required." }, { status: 400 });
    }

    const { error } = await supabase
        .from('employer_crm_profiles')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}


export const dynamic = "force-dynamic";
