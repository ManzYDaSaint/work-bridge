import { validateAuth } from "@/lib/auth-guard";
import { jobService } from "@/services/jobService";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const auth = await validateAuth(["EMPLOYER"]);
    if (auth.error) return auth.error;

    try {
        const stats = await jobService.getEmployerStats(auth.userId);
        const response = NextResponse.json(stats);
        response.headers.set("Cache-Control", "no-store, max-age=0");
        return response;
    } catch (error) {
        console.error("Employer Stats GET error:", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
