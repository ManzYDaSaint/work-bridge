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
  const { data, error } = await supabase
    .from("qualification_domains")
    .select("id, name, description, keywords, created_at")
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: "Failed to fetch domains" }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const auth = await validateAuth(["ADMIN"], false);
  if (auth.error) return auth.error;

  const payload = cleanDomainPayload(await request.json().catch(() => ({})));
  if (!payload.name) {
    return NextResponse.json({ error: "Domain name is required" }, { status: 400 });
  }

  const admin = getAdminSupabaseOrResponse();
  if (admin.error) return admin.error;
  const supabase = admin.supabase;
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
