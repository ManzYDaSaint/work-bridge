import { validateAuth } from "@/lib/auth-guard";
import { userService } from "@/services/userService";
import { NextResponse } from "next/server";
import { withAudit } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET() {
    const auth = await validateAuth(["ADMIN"], false);
    if (auth.error) return auth.error;

    try {
        const requests = await userService.getAccountClosureRequests({});
        return NextResponse.json(requests);
    } catch (error) {
        console.error("Close requests GET error:", error);
        return NextResponse.json({ error: "Failed to fetch close requests." }, { status: 500 });
    }
}

export const PATCH = withAudit(async (request: Request) => {
    const auth = await validateAuth(["ADMIN"], false);
    if (auth.error) return auth.error;

    try {
        const { id, status } = await request.json();
        await userService.updateAccountClosureStatus(id, status);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Close request PATCH error:", error);
        return NextResponse.json({ error: "Failed to update request." }, { status: 500 });
    }
}, "ADMIN_ACTION_CLOSE_REQUEST");
