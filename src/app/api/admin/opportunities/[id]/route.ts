import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
    updateOpportunity,
    publishOpportunity,
    archiveOpportunity,
    deleteOpportunity,
    OpportunityUpdatePayload,
} from "@/services/opportunityService";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

// Helper: enforce ADMIN role
async function requireAdmin() {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "ADMIN") return null;
    return user;
}

// ── GET /api/admin/opportunities/[id] ────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const supabase = getSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: "Server error" }, { status: 500 });

    const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .eq("id", params.id)
        .single();

    if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ opportunity: data });
}

// ── PATCH /api/admin/opportunities/[id] ──────────────────────────────────────
// Handles: update fields, publish, archive, feature
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    try {
        const body = await req.json();
        const { action, ...updateFields } = body;

        if (action === "publish") {
            const featured = body.featured ?? false;
            const data = await publishOpportunity(params.id, featured, admin.id);
            return NextResponse.json({ opportunity: data });
        }

        if (action === "archive") {
            const data = await archiveOpportunity(params.id, admin.id);
            return NextResponse.json({ opportunity: data });
        }

        // Default: update fields
        const payload: OpportunityUpdatePayload = updateFields;
        const data = await updateOpportunity(params.id, payload, admin.id);
        return NextResponse.json({ opportunity: data });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ── DELETE /api/admin/opportunities/[id] ─────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    try {
        await deleteOpportunity(params.id, admin.id);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
