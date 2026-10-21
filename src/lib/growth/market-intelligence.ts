import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export interface DomainFrequency {
  domainId: string | null;
  domainName: string;
  jobCount: number;
  sampleTitles: string[];
}

export interface InDemandJobTitle {
  title: string;
  count: number;
  domainName: string;
}

export interface MarketIntelligenceSummary {
  periodDays: number;
  totalActiveJobs: number;
  topDomains: DomainFrequency[];
  topJobTitles: InDemandJobTitle[];
  newJobsInPeriod: number;
  verifiedEmployersCount: number;
  totalApplicationsInPeriod: number;
}

/**
 * Deterministically aggregates platform hiring data and market statistics.
 * Never passes unverified figures to the AI model.
 */
export async function getMarketIntelligence(periodDays: number = 30): Promise<MarketIntelligenceSummary> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("[MarketIntelligence] Supabase admin client unavailable.");
  }

  const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

  // 1. Fetch domains lookup table
  const { data: domains } = await supabase
    .from("qualification_domains")
    .select("id, name");

  const domainMap = new Map<string, string>();
  (domains || []).forEach((d) => domainMap.set(d.id, d.name));

  // 2. Fetch jobs within the period (or active jobs)
  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("id, title, domain_id, status, created_at, location")
    .gte("created_at", periodStart)
    .order("created_at", { ascending: false });

  if (jobsError) {
    console.error("[MarketIntelligence] Error fetching jobs:", jobsError);
  }

  const safeJobs = jobs || [];

  // Count domain frequency
  const domainCounts = new Map<string, { count: number; titles: Set<string> }>();
  const titleCounts = new Map<string, { count: number; domainId: string | null }>();

  for (const job of safeJobs) {
    const dId = job.domain_id || "unclassified";
    if (!domainCounts.has(dId)) {
      domainCounts.set(dId, { count: 0, titles: new Set() });
    }
    const dEntry = domainCounts.get(dId)!;
    dEntry.count += 1;
    if (job.title && dEntry.titles.size < 5) {
      dEntry.titles.add(job.title.trim());
    }

    // Normalized title counts
    const cleanTitle = job.title ? job.title.trim() : "Untitled";
    if (!titleCounts.has(cleanTitle)) {
      titleCounts.set(cleanTitle, { count: 0, domainId: job.domain_id });
    }
    titleCounts.get(cleanTitle)!.count += 1;
  }

  // Format Top Domains
  const topDomains: DomainFrequency[] = Array.from(domainCounts.entries())
    .map(([domainId, entry]) => ({
      domainId: domainId === "unclassified" ? null : domainId,
      domainName: domainId === "unclassified" ? "General / Other Disciplines" : (domainMap.get(domainId) || "Other"),
      jobCount: entry.count,
      sampleTitles: Array.from(entry.titles),
    }))
    .sort((a, b) => b.jobCount - a.jobCount);

  // Format Top Job Titles
  const topJobTitles: InDemandJobTitle[] = Array.from(titleCounts.entries())
    .map(([title, entry]) => ({
      title,
      count: entry.count,
      domainName: entry.domainId ? (domainMap.get(entry.domainId) || "General") : "General",
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 3. Overall platform statistics
  const { count: totalActiveJobs } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .in("status", ["APPROVED", "ACTIVE"]);

  const { count: verifiedEmployersCount } = await supabase
    .from("employers")
    .select("id", { count: "exact", head: true })
    .eq("verification_status", "APPROVED");

  const { count: totalApplicationsInPeriod } = await supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .gte("created_at", periodStart);

  return {
    periodDays,
    totalActiveJobs: totalActiveJobs || 0,
    topDomains,
    topJobTitles,
    newJobsInPeriod: safeJobs.length,
    verifiedEmployersCount: verifiedEmployersCount || 0,
    totalApplicationsInPeriod: totalApplicationsInPeriod || 0,
  };
}
