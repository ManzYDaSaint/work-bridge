import { validateAuth } from "@/lib/auth-guard";
import { classifyQualification } from "@/lib/qualification-classifier";
import { invalidateQualificationMappingsCache } from "@/lib/mapping-cache";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

type AdminSupabase = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

function getAdminSupabaseOrResponse():
  | { error: NextResponse; supabase: null }
  | { error: null; supabase: AdminSupabase } {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      error: NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 }),
      supabase: null,
    };
  }

  return { error: null, supabase };
}
export async function POST(request: Request) {
  const auth = await validateAuth(["ADMIN"], false);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const mappingId = String(body?.mappingId ?? "").trim();
  const rawQualification = String(body?.rawQualification ?? "").trim().replace(/\s+/g, " ");

  if (!rawQualification) {
    return NextResponse.json({ error: "Raw qualification is required" }, { status: 400 });
  }

  const admin = getAdminSupabaseOrResponse();
  if (admin.error) return admin.error;
  const supabase = admin.supabase;
  const { data: domains, error: domainError } = await supabase
    .from("qualification_domains")
    .select("id, name")
    .order("name", { ascending: true });

  if (domainError || !domains) {
    return NextResponse.json({ error: "Failed to fetch domains" }, { status: 500 });
  }

  try {
    const domainName = await classifyQualification(rawQualification, domains.map((domain) => domain.name));
    if (domainName === "unknown") {
      return NextResponse.json({ error: "Gemini could not identify a matching domain" }, { status: 422 });
    }

    const domain = domains.find((item) => item.name.toLowerCase() === domainName.toLowerCase());
    if (!domain) {
      return NextResponse.json({ error: `Gemini suggested an unknown domain: ${domainName}` }, { status: 422 });
    }

    const query = supabase
      .from("qualification_mappings")
      .upsert({ raw_qualification: rawQualification, domain_id: domain.id, is_confirmed: true }, { onConflict: "raw_qualification" });

    const { error: upsertError } = mappingId
      ? await supabase
          .from("qualification_mappings")
          .update({ domain_id: domain.id, is_confirmed: true })
          .eq("id", mappingId)
      : await query;

    if (upsertError) {
      return NextResponse.json({ error: "Failed to save mapping" }, { status: 500 });
    }

    invalidateQualificationMappingsCache();
    return NextResponse.json({ success: true, domainName: domain.name });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Classification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
