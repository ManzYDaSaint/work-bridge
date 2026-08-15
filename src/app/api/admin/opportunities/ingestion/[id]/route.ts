import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { approveStagedOpportunity, rejectStagedOpportunity } from "@/services/opportunityIngestionService";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { action, reason } = body;

        if (action === "approve") {
            const published = await approveStagedOpportunity(id, user.id);
            return NextResponse.json({ success: true, published });
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
