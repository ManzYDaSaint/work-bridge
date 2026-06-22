import { NextResponse } from "next/server";

export function validateCronRequest(request: Request): NextResponse | null {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        console.error("[CRON] CRON_SECRET is not configured.");
        return NextResponse.json({ error: "Cron is not configured" }, { status: 503 });
    }

    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return null;
}
