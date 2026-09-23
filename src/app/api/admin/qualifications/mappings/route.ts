import { validateAuth } from "@/lib/auth-guard";
import { invalidateQualificationMappingsCache } from "@/lib/mapping-cache";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

type AdminSupabase = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;
type MappingAction = "CONFIRM" | "DELETE" | "SET_DOMAIN" | "CREATE_MAPPING" | "CREATE_DOMAIN_AND_MAP";

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

function normalizeQualification(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeKey(value: string) {
  return normalizeQualification(value).toLowerCase();
}

function cleanKeywords(input: unknown) {
  if (Array.isArray(input)) return input.map((item) => String(item).trim()).filter(Boolean);
  if (typeof input === "string") return input.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

export async function GET() {
  const auth = await validateAuth(["ADMIN"], false);
  if (auth.error) return auth.error;

  const admin = getAdminSupabaseOrResponse();
  if (admin.error) return admin.error;
  const supabase = admin.supabase;

  const [mappingsResult, jobsResult] = await Promise.all([
    supabase
      .from("qualification_mappings")
      .select("id, raw_qualification, domain_id, is_confirmed, created_at, qualification_domains(id, name)")
      .order("is_confirmed", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("jobs")
      .select("id, title, qualification, status, created_at")
      .not("qualification", "is", null)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  if (mappingsResult.error) return NextResponse.json({ error: "Failed to fetch mappings" }, { status: 500 });
  if (jobsResult.error) return NextResponse.json({ error: "Failed to fetch jobs for unmapped qualifications" }, { status: 500 });

  const mappings = mappingsResult.data ?? [];
  const mappedKeys = new Set(mappings.map((mapping) => normalizeKey(mapping.raw_qualification)));
  const grouped = new Map<string, {
    raw_qualification: string;
    job_count: number;
    sample_jobs: Array<{ id: string; title: string; status: string | null; created_at: string | null }>;
  }>();

  for (const job of jobsResult.data ?? []) {
    const raw = normalizeQualification(String(job.qualification ?? ""));
    if (!raw) continue;

    const key = normalizeKey(raw);
    if (mappedKeys.has(key)) continue;

    const existing = grouped.get(key) ?? { raw_qualification: raw, job_count: 0, sample_jobs: [] };
    existing.job_count += 1;
    if (existing.sample_jobs.length < 3) {
      existing.sample_jobs.push({
        id: job.id,
        title: job.title,
        status: job.status ?? null,
        created_at: job.created_at ?? null,
      });
    }
    grouped.set(key, existing);
  }

  return NextResponse.json({
    mappings,
    unmappedQualifications: Array.from(grouped.values()).sort((a, b) => b.job_count - a.job_count),
  });
}

export async function POST(request: Request) {
  const auth = await validateAuth(["ADMIN"], false);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const id = String(body?.id ?? "").trim();
  const action = body?.action as MappingAction | undefined;
  const admin = getAdminSupabaseOrResponse();
  if (admin.error) return admin.error;
  const supabase = admin.supabase;

  if (action === "CONFIRM") {
    if (!id) return NextResponse.json({ error: "Mapping id is required" }, { status: 400 });
    const { error } = await supabase
      .from("qualification_mappings")
      .update({ is_confirmed: true })
      .eq("id", id);
    if (error) return NextResponse.json({ error: "Failed to confirm mapping" }, { status: 500 });
  } else if (action === "DELETE") {
    if (!id) return NextResponse.json({ error: "Mapping id is required" }, { status: 400 });
    const { error } = await supabase.from("qualification_mappings").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "Failed to delete mapping" }, { status: 500 });
  } else if (action === "SET_DOMAIN") {
    if (!id) return NextResponse.json({ error: "Mapping id is required" }, { status: 400 });
    const domainId = String(body?.domainId ?? "").trim();
    if (!domainId) return NextResponse.json({ error: "Domain id is required" }, { status: 400 });

    const { error } = await supabase
      .from("qualification_mappings")
      .update({ domain_id: domainId, is_confirmed: Boolean(body?.confirm) })
      .eq("id", id);
    if (error) return NextResponse.json({ error: "Failed to update mapping domain" }, { status: 500 });
  } else if (action === "CREATE_MAPPING") {
    const rawQualification = normalizeQualification(String(body?.rawQualification ?? ""));
    const domainId = String(body?.domainId ?? "").trim();
    if (!rawQualification) return NextResponse.json({ error: "Raw qualification is required" }, { status: 400 });
    if (!domainId) return NextResponse.json({ error: "Domain id is required" }, { status: 400 });

    const { error } = await supabase
      .from("qualification_mappings")
      .upsert({ raw_qualification: rawQualification, domain_id: domainId, is_confirmed: true }, { onConflict: "raw_qualification" });
    if (error) return NextResponse.json({ error: error.message || "Failed to create mapping" }, { status: 500 });
  } else if (action === "CREATE_DOMAIN_AND_MAP") {
    const rawQualification = normalizeQualification(String(body?.rawQualification ?? ""));
    const name = String(body?.name ?? "").trim();
    const description = String(body?.description ?? "").trim();
    const keywords = cleanKeywords(body?.keywords);

    if (!rawQualification) return NextResponse.json({ error: "Raw qualification is required" }, { status: 400 });
    if (!name) return NextResponse.json({ error: "Domain name is required" }, { status: 400 });

    const { data: domain, error: domainError } = await supabase
      .from("qualification_domains")
      .upsert({ name, description: description || null, keywords }, { onConflict: "name" })
      .select("id, name")
      .single();

    if (domainError || !domain) {
      return NextResponse.json({ error: domainError?.message || "Failed to create domain" }, { status: 500 });
    }

    const { error } = await supabase
      .from("qualification_mappings")
      .upsert({ raw_qualification: rawQualification, domain_id: domain.id, is_confirmed: true }, { onConflict: "raw_qualification" });
    if (error) return NextResponse.json({ error: error.message || "Failed to map new domain" }, { status: 500 });
  } else {
    return NextResponse.json({ error: "Unsupported mapping action" }, { status: 400 });
  }

  invalidateQualificationMappingsCache();
  return NextResponse.json({ success: true });
}
