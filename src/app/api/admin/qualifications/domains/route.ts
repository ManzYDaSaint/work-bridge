import { validateAuth } from "@/lib/auth-guard";
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
function cleanDomainPayload(input: any) {
  const name = String(input?.name ?? "").trim();
  const description = String(input?.description ?? "").trim();
  const keywords = Array.isArray(input?.keywords)
    ? input.keywords.map((keyword: unknown) => String(keyword).trim()).filter(Boolean)
    : typeof input?.keywords === "string"
      ? input.keywords.split(",").map((keyword: string) => keyword.trim()).filter(Boolean)
      : [];

  return { name, description: description || null, keywords };
}

export async function GET() {
  const auth = await validateAuth(["ADMIN"], false);
  if (auth.error) return auth.error;

  const admin = getAdminSupabaseOrResponse();
  if (admin.error) return admin.error;
  const supabase = admin.supabase;

  const [domainsResult, mappingsResult] = await Promise.all([
    supabase
      .from("qualification_domains")
      .select("id, name, description, keywords, created_at")
      .order("name", { ascending: true }),
    supabase
      .from("qualification_mappings")
      .select("domain_id")
      .not("domain_id", "is", null),
  ]);

  if (domainsResult.error) return NextResponse.json({ error: "Failed to fetch domains" }, { status: 500 });

  const countMap = new Map<string, number>();
  for (const m of mappingsResult.data ?? []) {
    if (m.domain_id) {
      countMap.set(m.domain_id, (countMap.get(m.domain_id) ?? 0) + 1);
    }
  }

  const domainsWithCount = (domainsResult.data ?? []).map((d) => ({
    ...d,
    mapping_count: countMap.get(d.id) ?? 0,
  }));

  return NextResponse.json(domainsWithCount);
}

export async function POST(request: Request) {
  const auth = await validateAuth(["ADMIN"], false);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const admin = getAdminSupabaseOrResponse();
  if (admin.error) return admin.error;
  const supabase = admin.supabase;

  // Domain Merge Action
  if (body?.action === "MERGE") {
    const sourceDomainId = String(body?.sourceDomainId ?? "").trim();
    const targetDomainId = String(body?.targetDomainId ?? "").trim();

    if (!sourceDomainId || !targetDomainId) {
      return NextResponse.json({ error: "Source and target domain IDs are required" }, { status: 400 });
    }
    if (sourceDomainId === targetDomainId) {
      return NextResponse.json({ error: "Source and target domains must be different" }, { status: 400 });
    }

    // Reassign all qualification mappings from source to target domain
    const { error: updateError } = await supabase
      .from("qualification_mappings")
      .update({ domain_id: targetDomainId, is_confirmed: true })
      .eq("domain_id", sourceDomainId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message || "Failed to reassign mappings" }, { status: 500 });
    }

    // Delete source domain
    const { error: deleteError } = await supabase
      .from("qualification_domains")
      .delete()
      .eq("id", sourceDomainId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message || "Failed to delete merged source domain" }, { status: 500 });
    }

    invalidateQualificationMappingsCache();
    return NextResponse.json({ success: true, message: "Domains merged successfully" });
  }

  const payload = cleanDomainPayload(body);
  if (!payload.name) {
    return NextResponse.json({ error: "Domain name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("qualification_domains")
    .insert([payload])
    .select("id, name, description, keywords, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message || "Failed to create domain" }, { status: 500 });
  invalidateQualificationMappingsCache();
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: Request) {
  const auth = await validateAuth(["ADMIN"], false);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const id = String(body?.id ?? "").trim();
  const payload = cleanDomainPayload(body);

  if (!id) return NextResponse.json({ error: "Domain id is required" }, { status: 400 });
  if (!payload.name) return NextResponse.json({ error: "Domain name is required" }, { status: 400 });

  const admin = getAdminSupabaseOrResponse();
  if (admin.error) return admin.error;
  const supabase = admin.supabase;
  const { data, error } = await supabase
    .from("qualification_domains")
    .update(payload)
    .eq("id", id)
    .select("id, name, description, keywords, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message || "Failed to update domain" }, { status: 500 });
  invalidateQualificationMappingsCache();
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const auth = await validateAuth(["ADMIN"], false);
  if (auth.error) return auth.error;

  const { id } = await request.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "Domain id is required" }, { status: 400 });

  const admin = getAdminSupabaseOrResponse();
  if (admin.error) return admin.error;
  const supabase = admin.supabase;

  const { error: mappingError } = await supabase
    .from("qualification_mappings")
    .update({ domain_id: null, is_confirmed: false })
    .eq("domain_id", id);

  if (mappingError) {
    return NextResponse.json({ error: mappingError.message || "Failed to clear dependent mappings" }, { status: 500 });
  }

  const { error } = await supabase
    .from("qualification_domains")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message || "Failed to delete domain" }, { status: 500 });
  invalidateQualificationMappingsCache();
  return NextResponse.json({ success: true });
}
