import { NextResponse } from "next/server";
import { runGrowthAgentPlanner } from "@/lib/growth/growth-agent";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Weekly Growth Agent Planner CRON endpoint.
 * Called on Mondays by master cron or directly.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const result = await runGrowthAgentPlanner("WEEKLY", "ENGLISH");
    return NextResponse.json({
      success: true,
      runId: result.runId,
      summary: result.summary,
      slotsCount: result.suggestions.length,
    });
  } catch (err: any) {
    console.error("[CRON growth-agent-planner] Execution failed:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
