import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { sendInviteToApply } from "@/lib/invite-service";

export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { userId, jobId, companyName, jobTitle } = body;

        if (!userId || !jobId || !companyName || !jobTitle) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const result = await sendInviteToApply(userId, jobId, companyName, jobTitle);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: result.data });
    } catch (error: any) {
        console.error("Invite API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}