import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
    approveStagedOpportunity,
    rejectStagedOpportunity,
    getStagedOpportunityById,
    updateStagedOpportunity,
    type StagedOpportunityUpdatePayload,
} from "@/services/opportunityIngestionService";

async function requireUser() {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const item = await getStagedOpportunityById(id);
        if (!item) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        return NextResponse.json({ item });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to fetch item" }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const payload = body as StagedOpportunityUpdatePayload;
        const item = await updateStagedOpportunity(id, payload);
        return NextResponse.json({ success: true, item });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Update failed" }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { action, reason, publish, featured, slug, organization_logo, source, weight_education, weight_certifications, weight_skills, weight_location } = body;

        if (action === "approve") {
            const opportunity = await approveStagedOpportunity(id, user.id, {
                publish: publish !== false,
                featured: featured === true,
                slug,
                organization_logo,
                source,
                weight_education,
                weight_certifications,
                weight_skills,
                weight_location,
            });
            return NextResponse.json({ success: true, opportunity });
        }

        if (action === "reject") {
            await rejectStagedOpportunity(id, user.id, reason);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Action failed" }, { status: 500 });
    }
}
