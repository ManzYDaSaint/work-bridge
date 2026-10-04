/**
 * Domain Classifier Agent
 * ─────────────────────────────────────────────────────────────────────────────
 * Fires immediately (fire-and-forget) after:
 *   • A Job is inserted/approved        → classifies job qualification + title
 *   • A Seeker registers/updates profile → classifies education qualification
 *
 * Responsibilities:
 *   1. Skip if domain_id is already set (keyword match already resolved it)
 *   2. Use Gemini AI to classify raw qualification text against known domains
 *   3. If Gemini matches an existing domain → assign it
 *   4. If Gemini suggests a NEW domain → create the domain, then assign it
 *   5. Cache the result in `qualification_mappings` for future keyword hits
 *   6. Write `domain_id` + `domain_source: 'ai_agent'` back to the record
 *   7. Emit a Mission Control event for observability
 *
 * This agent is idempotent — safe to call multiple times for the same record.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { extractSeekerEducationQualification } from "@/lib/matching-helpers-shared";
import { emitSystemEvent } from "@/lib/mission-control";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Constants ───────────────────────────────────────────────────────────────

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const DOMAIN_SOURCE = "ai_agent" as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export type ClassifierTarget = "JOB" | "SEEKER";

export interface JobClassifierInput {
  target: "JOB";
  recordId: string;         // jobs.id
  qualification: string | null;
  title: string;
  currentDomainId?: string | null;
}

export interface SeekerClassifierInput {
  target: "SEEKER";
  recordId: string;         // job_seekers.id (= users.id)
  qualification: string | null;
  education: Array<Record<string, any>> | null;
  currentDomainId?: string | null;
}

export type DomainClassifierInput = JobClassifierInput | SeekerClassifierInput;

export interface DomainClassifierResult {
  skipped: boolean;
  domainId: string | null;
  domainName: string | null;
  isNewDomain: boolean;
  qualificationText: string;
  source: typeof DOMAIN_SOURCE | "already_set";
  error?: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function normalizeDomainName(value: string): string {
  return value.trim().toLowerCase().replace(/["'`.,;:]+$/g, "");
}

/**
 * Calls Gemini to classify a raw qualification string.
 * Returns the matched domain name from the known list, OR a suggested new
 * domain name if none fit, OR "unknown" if Gemini cannot classify at all.
 *
 * The prompt is intentionally different from the cron's `classifyQualification()`
 * because here we also want Gemini to SUGGEST a clean domain name when none exist —
 * so the agent can create it on the fly.
 */
async function geminiClassify(
  qualificationText: string,
  knownDomains: Array<{ id: string; name: string }>
): Promise<{ type: "existing"; domainId: string; domainName: string } | { type: "new"; suggestedName: string } | { type: "unknown" }> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("[DomainAgent] GEMINI_API_KEY is not configured.");
  }

  const domainList = knownDomains.map((d) => `- ${d.name}`).join("\n");

  const prompt = `You are a qualification domain classifier for a job platform in Malawi.

Your task: classify the following qualification text into the best-matching domain.

Known domains:
${domainList}

Qualification text: "${qualificationText}"

Instructions:
1. If the qualification clearly fits one of the known domains, respond ONLY with:
   MATCH: <exact domain name from the list above>

2. If the qualification does NOT fit any known domain, suggest a clean, concise new domain name (2-4 words, lowercase, use underscores for spaces) and respond ONLY with:
   NEW: <suggested_domain_name>

3. If you genuinely cannot classify (empty or meaningless text), respond ONLY with:
   UNKNOWN

Do not include explanations, punctuation beyond what is shown, or markdown.`;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const result = await model.generateContent(prompt);
  const raw = (result.response.text() || "").trim();

  if (raw.startsWith("MATCH:")) {
    const suggested = normalizeDomainName(raw.replace(/^MATCH:/i, "").trim());
    const matched = knownDomains.find(
      (d) => normalizeDomainName(d.name) === suggested
    );
    if (matched) {
      return { type: "existing", domainId: matched.id, domainName: matched.name };
    }
    // Gemini said MATCH but the name doesn't perfectly align — fuzzy fallback
    const fuzzy = knownDomains.find((d) =>
      normalizeDomainName(d.name).includes(suggested) ||
      suggested.includes(normalizeDomainName(d.name))
    );
    if (fuzzy) {
      return { type: "existing", domainId: fuzzy.id, domainName: fuzzy.name };
    }
    // Treat the Gemini suggestion as a new domain name if no fuzzy match
    return { type: "new", suggestedName: suggested.replace(/\s+/g, "_") };
  }

  if (raw.startsWith("NEW:")) {
    const suggestedRaw = raw.replace(/^NEW:/i, "").trim();
    // Sanitise: lowercase, underscores, max 50 chars
    const suggestedName = suggestedRaw
      .toLowerCase()
      .replace(/[^a-z0-9_\s]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 50);
    if (suggestedName) {
      return { type: "new", suggestedName };
    }
  }

  return { type: "unknown" };
}

/**
 * Ensures a domain exists in `qualification_domains`.
 * Upserts on name (unique) and returns the domain id.
 */
async function ensureDomain(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  name: string
): Promise<{ id: string; name: string; isNew: boolean }> {
  // Try to find existing first (case-insensitive)
  const { data: existing } = await supabase
    .from("qualification_domains")
    .select("id, name")
    .ilike("name", name)
    .maybeSingle();

  if (existing) {
    return { id: existing.id, name: existing.name, isNew: false };
  }

  // Create new domain
  const { data: created, error } = await supabase
    .from("qualification_domains")
    .insert({
      name,
      description: `Auto-created by Domain Classifier Agent`,
      keywords: [name.replace(/_/g, " ")],
    })
    .select("id, name")
    .single();

  if (error || !created) {
    // Race condition: another request may have created it — try fetching again
    const { data: retry } = await supabase
      .from("qualification_domains")
      .select("id, name")
      .ilike("name", name)
      .maybeSingle();
    if (retry) return { id: retry.id, name: retry.name, isNew: false };
    throw new Error(`[DomainAgent] Failed to create domain "${name}": ${error?.message}`);
  }

  return { id: created.id, name: created.name, isNew: true };
}

/**
 * Upserts a mapping into `qualification_mappings` so the cron and keyword
 * matcher will hit it on future runs without calling Gemini again.
 */
async function cacheMapping(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  rawQualification: string,
  domainId: string
): Promise<void> {
  await supabase
    .from("qualification_mappings")
    .upsert(
      {
        raw_qualification: rawQualification,
        domain_id: domainId,
        is_confirmed: false, // admin can confirm later
      },
      { onConflict: "raw_qualification" }
    )
    .throwOnError();
}

// ─── Core Agent Function ──────────────────────────────────────────────────────

/**
 * Runs the Domain Classifier Agent for a single Job or Seeker record.
 *
 * ALWAYS call this fire-and-forget:
 *   classifyDomainForRecord(input).catch(err => console.error("[DomainAgent]", err));
 *
 * Do NOT await it in the request handler — it must not block the response.
 */
export async function classifyDomainForRecord(
  input: DomainClassifierInput
): Promise<DomainClassifierResult> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      skipped: true,
      domainId: null,
      domainName: null,
      isNewDomain: false,
      qualificationText: "",
      source: "ai_agent",
      error: "Admin client unavailable",
    };
  }

  try {
    // ── Step 1: Skip if domain already assigned ───────────────────────────
    if (input.currentDomainId) {
      return {
        skipped: true,
        domainId: input.currentDomainId,
        domainName: null,
        isNewDomain: false,
        qualificationText: "",
        source: "already_set",
      };
    }

    // ── Step 2: Build the qualification text to classify ──────────────────
    let qualificationText = "";

    if (input.target === "JOB") {
      // For jobs: combine qualification requirement + job title for richer context
      qualificationText = [input.qualification, input.title]
        .filter(Boolean)
        .join(" ")
        .trim();
    } else {
      // For seekers: combine declared qualification + all education entries
      qualificationText = extractSeekerEducationQualification(
        input.qualification,
        input.education
      ).trim();
    }

    if (!qualificationText) {
      return {
        skipped: true,
        domainId: null,
        domainName: null,
        isNewDomain: false,
        qualificationText: "",
        source: "ai_agent",
        error: "No qualification text to classify",
      };
    }

    // ── Step 3: Load all known domains ───────────────────────────────────
    const { data: domains, error: domainError } = await supabase
      .from("qualification_domains")
      .select("id, name")
      .order("name", { ascending: true });

    if (domainError || !domains) {
      throw new Error(`Failed to fetch domains: ${domainError?.message}`);
    }

    // ── Step 4: Check qualification_mappings cache first ─────────────────
    // If a previous run already classified this exact text, skip Gemini.
    const normalizedQual = qualificationText.trim().toLowerCase();
    const { data: cachedMapping } = await supabase
      .from("qualification_mappings")
      .select("domain_id, qualification_domains(id, name)")
      .ilike("raw_qualification", qualificationText)
      .not("domain_id", "is", null)
      .maybeSingle();

    let resolvedDomainId: string | null = null;
    let resolvedDomainName: string | null = null;
    let isNewDomain = false;

    if (cachedMapping?.domain_id) {
      // Cache hit — no Gemini call needed
      resolvedDomainId = cachedMapping.domain_id;
      const domainInfo = Array.isArray(cachedMapping.qualification_domains)
        ? cachedMapping.qualification_domains[0]
        : (cachedMapping.qualification_domains as any);
      resolvedDomainName = domainInfo?.name ?? null;
    } else {
      // ── Step 5: Call Gemini ─────────────────────────────────────────────
      const geminiResult = await geminiClassify(qualificationText, domains);

      if (geminiResult.type === "unknown") {
        await emitSystemEvent({
          category: "SYSTEM",
          severity: "WARNING",
          event: "DOMAIN_CLASSIFICATION_UNKNOWN",
          message: `[DomainAgent] Could not classify qualification for ${input.target} ${input.recordId}`,
          metadata: { target: input.target, recordId: input.recordId, qualificationText },
        });
        return {
          skipped: false,
          domainId: null,
          domainName: null,
          isNewDomain: false,
          qualificationText,
          source: "ai_agent",
          error: "Gemini returned UNKNOWN",
        };
      }

      if (geminiResult.type === "existing") {
        resolvedDomainId = geminiResult.domainId;
        resolvedDomainName = geminiResult.domainName;
        isNewDomain = false;
      } else {
        // ── Step 6: Create new domain ───────────────────────────────────
        const created = await ensureDomain(supabase, geminiResult.suggestedName);
        resolvedDomainId = created.id;
        resolvedDomainName = created.name;
        isNewDomain = created.isNew;
      }

      // ── Step 7: Cache in qualification_mappings ─────────────────────────
      if (resolvedDomainId) {
        await cacheMapping(supabase, qualificationText, resolvedDomainId).catch((err) =>
          console.warn("[DomainAgent] Cache mapping failed (non-fatal):", err)
        );
      }
    }

    if (!resolvedDomainId) {
      return {
        skipped: false,
        domainId: null,
        domainName: null,
        isNewDomain: false,
        qualificationText,
        source: "ai_agent",
        error: "No domain resolved",
      };
    }

    // ── Step 8: Write domain_id back to the record ────────────────────────
    const now = new Date().toISOString();

    if (input.target === "JOB") {
      await supabase
        .from("jobs")
        .update({
          domain_id: resolvedDomainId,
          domain_classified_at: now,
          domain_source: DOMAIN_SOURCE,
        })
        .eq("id", input.recordId)
        .is("domain_id", null) // Only update if still unset (safety guard)
        .throwOnError();
    } else {
      await supabase
        .from("job_seekers")
        .update({
          domain_id: resolvedDomainId,
          domain_classified_at: now,
          domain_source: DOMAIN_SOURCE,
        })
        .eq("id", input.recordId)
        .is("domain_id", null) // Only update if still unset (safety guard)
        .throwOnError();
    }

    // ── Step 9: Emit telemetry ────────────────────────────────────────────
    await emitSystemEvent({
      category: "SYSTEM",
      severity: "SUCCESS",
      event: "DOMAIN_CLASSIFIED",
      message: `[DomainAgent] ${input.target} ${input.recordId} → domain "${resolvedDomainName}"${isNewDomain ? " (NEW)" : ""}`,
      metadata: {
        target: input.target,
        recordId: input.recordId,
        domainId: resolvedDomainId,
        domainName: resolvedDomainName,
        isNewDomain,
        qualificationText,
        source: DOMAIN_SOURCE,
      },
    });

    return {
      skipped: false,
      domainId: resolvedDomainId,
      domainName: resolvedDomainName,
      isNewDomain,
      qualificationText,
      source: DOMAIN_SOURCE,
    };
  } catch (err: any) {
    console.error(`[DomainAgent] Error classifying ${input.target} ${input.recordId}:`, err);

    await emitSystemEvent({
      category: "SYSTEM",
      severity: "WARNING",
      event: "DOMAIN_CLASSIFICATION_FAILED",
      message: `[DomainAgent] Failed to classify ${input.target} ${input.recordId}: ${err?.message}`,
      metadata: {
        target: input.target,
        recordId: input.recordId,
        error: err?.message,
      },
    }).catch(() => {});

    return {
      skipped: false,
      domainId: null,
      domainName: null,
      isNewDomain: false,
      qualificationText: "",
      source: "ai_agent",
      error: err?.message || "Unknown error",
    };
  }
}
