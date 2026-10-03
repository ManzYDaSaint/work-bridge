/**
 * POST /api/agents/match-dispatcher
 *
 * Admin route to trigger or test the Match Dispatch Agent for a given job.
 * Body:
 *   {
 *     jobId: "<uuid>",
 *     forceImmediateEmail?: boolean
 *   }
 */
import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth-guard";
import { runMatchDispatchAgent } from "@/lib/agents/match-dispatch-agent";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
    const auth = await validateAuth(["ADMIN"], false);
    if (auth.error) return auth.error;

    try {
        const body = await request.json();
        const { jobId, forceImmediateEmail = false } = body;

        if (!jobId) {
            return NextResponse.json({ error: "jobId is required" }, { status: 400 });
        }

        const summary = await runMatchDispatchAgent({
            jobId,
            forceImmediateEmail,
        });

        return NextResponse.json({
            success: true,
            summary,
        });
    } catch (err: any) {
        console.error("[MatchDispatcher API] Error:", err);
        return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
    }
}
