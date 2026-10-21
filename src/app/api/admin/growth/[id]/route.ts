import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/**
 * PATCH: Update status of a suggestion (e.g. POSTED, APPROVED, DISMISSED)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { status, proposed_caption, creative_brief } = body;

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database client unavailable" }, { status: 500 });
  }

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (status) updates.status = status;
  if (proposed_caption !== undefined) updates.proposed_caption = proposed_caption;
  if (creative_brief !== undefined) updates.creative_brief = creative_brief;

  const { data, error } = await supabase
    .from("growth_agent_suggestions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, suggestion: data });
}

/**
 * POST: Regenerate a specific post suggestion slot with custom instruction & languageMode
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const customInstruction = body?.customInstruction;
  const languageMode = body?.languageMode === "BILINGUAL" ? "BILINGUAL" : "ENGLISH";

  try {
    const { regenerateSinglePostSlot } = await import("@/lib/growth/growth-agent");
    const regenerated = await regenerateSinglePostSlot(id, customInstruction, languageMode);
    return NextResponse.json({ success: true, slot: regenerated });
  } catch (err: any) {
    console.error("[API Growth Agent] Slot regeneration failed:", err);
    return NextResponse.json(
      { error: err.message || "Failed to regenerate post slot" },
      { status: 500 }
    );
  }
}

