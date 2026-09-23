import 'server-only';
import NodeCache from "node-cache";
import { getSupabaseAdminClient } from "./supabase-admin";

const CACHE_KEY = "qualification_mappings";
const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

export function invalidateQualificationMappingsCache() {
  cache.del(CACHE_KEY);
}

export async function getCachedQualificationMappings() {
  const cached = cache.get(CACHE_KEY);
  if (cached) return cached;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("qualification_mappings")
    .select("raw_qualification, domain_id, qualification_domains(name)")
    .not("domain_id", "is", null);

  if (error || !data) return [];

  const mappings = data
    .filter((m) => (m.qualification_domains as any)?.name)
    .map((m) => ({
      raw: m.raw_qualification.toLowerCase(),
      domain: (m.qualification_domains as any).name,
    }));

  cache.set(CACHE_KEY, mappings);
  return mappings;
}
