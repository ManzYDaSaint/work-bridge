import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
    getAllOpportunitiesAdmin,
    createOpportunity,
    getOpportunityAnalytics,
    detectDuplicateOpportunity,
    sweepExpiredOpportunities,
    OpportunityCreatePayload,
} from "@/services/opportunityService";

// Helper: enforce ADMIN role
async function requireAdmin() {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "ADMIN") return null;
    return user;
}

// ── GET /api/admin/opportunities ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const withAnalytics = searchParams.get("analytics") === "true";
    const runSweep = searchParams.get("sweep") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (runSweep) {
        await sweepExpiredOpportunities();
    }

    const [opportunities, analytics] = await Promise.all([
        getAllOpportunitiesAdmin({ limit, offset }),
        withAnalytics ? getOpportunityAnalytics() : Promise.resolve(null),
    ]);

    return NextResponse.json({ opportunities, analytics });
}

// ── POST /api/admin/opportunities ────────────────────────────────────────────
export async function POST(req: NextRequest) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    try {
        const body = await req.json();

        // Validate required fields
        const required = ["title", "slug", "category", "organization_name", "description", "short_description", "application_url", "location_type", "funding_type"];
        for (const field of required) {
            if (!body[field]) {
                return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
            }
        }

        // Sanitise application URL
        try {
            new URL(body.application_url);
        } catch {
            return NextResponse.json({ error: "Invalid application_url — must be a full URL." }, { status: 400 });
        }

        // Duplicate Opportunity Check (#5)
        const isDuplicate = await detectDuplicateOpportunity({
            title: body.title,
            organization_name: body.organization_name,
            deadline: body.deadline,
        });

        const payload: OpportunityCreatePayload = {
            ...body,
            source: body.source || "MANUAL",
            created_by_admin: admin.id,
        };

        const opportunity = await createOpportunity(payload);

        return NextResponse.json({
            opportunity,
            warning: isDuplicate ? "A similar opportunity already exists. Event logged in Mission Control." : undefined
        }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
