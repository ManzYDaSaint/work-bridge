import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export type DispatchMode = "MANUAL" | "AUTO";

let inMemoryDispatchMode: DispatchMode = "MANUAL";

export async function getMatchDispatchMode(): Promise<DispatchMode> {
  if (process.env.ADMIN_MATCH_DISPATCH_MODE === "AUTO") {
    return "AUTO";
  }

  const supabase = getSupabaseAdminClient();
  if (supabase) {
    try {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "ADMIN_MATCH_DISPATCH_MODE")
        .single();

      if (data?.value === "AUTO" || data?.value === "MANUAL") {
        return data.value as DispatchMode;
      }
    } catch {
      // Fall back to in-memory state
    }
  }

  return inMemoryDispatchMode;
}

export async function setMatchDispatchMode(mode: DispatchMode): Promise<boolean> {
  inMemoryDispatchMode = mode;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return true;

  try {
    await supabase.from("system_settings").upsert({
      key: "ADMIN_MATCH_DISPATCH_MODE",
      value: mode,
      updated_at: new Date().toISOString()
    }, { onConflict: "key" });
    return true;
  } catch {
    return true;
  }
}
