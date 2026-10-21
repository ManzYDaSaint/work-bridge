import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { runGrowthAgentPlanner } from "@/lib/growth/growth-agent";
import { getMarketIntelligence } from "@/lib/growth/market-intelligence";

export const dynamic = "force-dynamic";

/**
 * GET: Fetches the latest Growth Agent run, suggestions, and current market intelligence.
 */
export async function GET() {
  const auth = await validateAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database client unavailable" }, { status: 500 });
  }

  // 1. Fetch latest market intelligence
  const market = await getMarketIntelligence(30).catch(() => null);

  // 2. Fetch the most recent completed run
  const { data: latestRun } = await supabase
    .from("growth_agent_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 3. Fetch suggestions from the latest run (or any active suggestions)
  let suggestions: any[] = [];
  if (latestRun) {
    const { data: rows } = await supabase
      .from("growth_agent_suggestions")
      .select("*")
      .eq("run_id", latestRun.id)
      .order("created_at", { ascending: true });
    suggestions = rows || [];
  }

  return NextResponse.json({
    latestRun,
    suggestions,
    marketIntelligence: market,
  });
}

/**
 * POST: Manually trigger a new Growth Agent planning run.
 */
export async function POST(request: Request) {
  const auth = await validateAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    const languageMode = body?.languageMode === "BILINGUAL" ? "BILINGUAL" : "ENGLISH";

    const result = await runGrowthAgentPlanner("MANUAL", languageMode);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error("[API Growth Agent] Failed to run planner:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate weekly growth plan" },
      { status: 500 }
    );
  }
}
