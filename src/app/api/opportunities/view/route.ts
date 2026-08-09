import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { recordOpportunityView } from "@/services/opportunityService";

// ── POST /api/opportunities/[slug]/view ──────────────────────────────────────
// Tracks a page view or apply-click. Safe for anonymous users.
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { opportunityId, applyClicked } = body;

        if (!opportunityId) return NextResponse.json({ error: "opportunityId required" }, { status: 400 });

        // Try to get user id (nullable — anonymous views are valid)
        let userId: string | undefined;
        try {
            const supabase = await createSupabaseServerClient();
            const { data: { user } } = await supabase.auth.getUser();
            userId = user?.id;
        } catch {
            // Anonymous — proceed without userId
        }

        // Extract IP from request headers (Vercel populates x-forwarded-for)
        const ipAddress =
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            undefined;

        await recordOpportunityView({
            opportunityId,
            userId,
            ipAddress,
            applyClicked: applyClicked ?? false,
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
