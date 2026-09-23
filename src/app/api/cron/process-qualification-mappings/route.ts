import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { classifyQualification } from "@/lib/qualification-classifier";
import { invalidateQualificationMappingsCache } from "@/lib/mapping-cache";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

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

function normalizeQualification(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeKey(value: string) {
  return normalizeQualification(value).toLowerCase();
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = getAdminSupabaseOrResponse();
  if (admin.error) return admin.error;
  const supabase = admin.supabase;

  // 1. Fetch existing domains
  const { data: domains, error: domainError } = await supabase
    .from("qualification_domains")
    .select("id, name")
    .order("name", { ascending: true });

  if (domainError || !domains) {
    return NextResponse.json({ error: "Failed to fetch qualification domains" }, { status: 500 });
  }

  // 2. Fetch existing mappings
  const { data: mappingsData, error: mappingsError } = await supabase
    .from("qualification_mappings")
    .select("id, raw_qualification, domain_id");

  if (mappingsError) {
    return NextResponse.json({ error: "Failed to fetch qualification mappings" }, { status: 500 });
  }

  const mappedDomainMap = new Map<string, string | null>();
  for (const mapping of mappingsData ?? []) {
    mappedDomainMap.set(normalizeKey(mapping.raw_qualification), mapping.domain_id ?? null);
  }

  // 3. Scan active jobs for unmapped or unclassified qualifications
  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("id, title, qualification")
    .eq("status", "ACTIVE")
    .not("qualification", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (jobsError) {
    return NextResponse.json({ error: "Failed to fetch active jobs" }, { status: 500 });
  }

  const unmappedSet = new Set<string>();
  for (const job of jobs ?? []) {
    const raw = normalizeQualification(String(job.qualification ?? ""));
    if (!raw) continue;

    const key = normalizeKey(raw);
    const domainId = mappedDomainMap.get(key);
    if (!mappedDomainMap.has(key) || !domainId) {
      unmappedSet.add(raw);
    }
  }

  const rawList = Array.from(unmappedSet);
  if (rawList.length === 0) {
    return NextResponse.json({ success: true, processed: 0, message: "No unmapped qualifications found on active jobs." });
  }

  // Process batch of up to 25 items per run to respect execution limits
  const batch = rawList.slice(0, 25);
  const currentDomainNames = domains.map((d) => d.name);
  let classifiedCount = 0;
  const results: Array<{ qualification: string; domain: string; isNewDomain: boolean }> = [];

  for (const rawQual of batch) {
    try {
      let domainName = await classifyQualification(rawQual, currentDomainNames);
      let targetDomainId: string | null = null;
      let isNewDomain = false;

      if (domainName !== "unknown") {
        const existing = domains.find((d) => d.name.toLowerCase() === domainName.toLowerCase());
        if (existing) {
          targetDomainId = existing.id;
        }
      }

      // If Gemini could not classify into an existing domain, or returned unknown, create a clean domain
      if (!targetDomainId) {
        // Create a clean domain name from raw qualification if unknown
        const newName = domainName !== "unknown" ? domainName : rawQual.split(/[,;\(/]/)[0].trim();
        const { data: newDomain, error: createError } = await supabase
          .from("qualification_domains")
          .upsert({ name: newName, description: "Auto-created by Qualification Mapping Cron", keywords: [newName] }, { onConflict: "name" })
          .select("id, name")
          .single();

        if (newDomain && !createError) {
          targetDomainId = newDomain.id;
          domainName = newDomain.name;
          isNewDomain = true;
          domains.push(newDomain);
          currentDomainNames.push(newDomain.name);
        }
      }

      if (targetDomainId) {
        const { error: upsertError } = await supabase
          .from("qualification_mappings")
          .upsert(
            {
              raw_qualification: rawQual,
              domain_id: targetDomainId,
              is_confirmed: false, // Flag for optional admin review
            },
            { onConflict: "raw_qualification" }
          );

        if (!upsertError) {
          classifiedCount++;
          results.push({ qualification: rawQual, domain: domainName, isNewDomain });
        }
      }
    } catch (err) {
      console.error(`Error classifying qualification "${rawQual}":`, err);
    }
  }

  if (classifiedCount > 0) {
    invalidateQualificationMappingsCache();
  }

  return NextResponse.json({
    success: true,
    processed: classifiedCount,
    totalUnmappedFound: rawList.length,
    results,
  });
}
