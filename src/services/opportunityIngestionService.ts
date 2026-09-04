/**
 * Aganyu Opportunity Ingestion Engine — Service Layer
 *
 * Handles:
 * 1. Source crawling & raw payload ingestion into `ingested_opportunity_raw_payloads`
 * 2. Gemini AI extraction into `ingested_opportunities_queue`
 * 3. Administrative approval, rejection, and publishing to `public.opportunities`
 *
 * Fully separated from Job Ingestion schema and tables.
 */

import crypto from "crypto";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getConnector } from "@/lib/ingestion/connectors";
import { parseOpportunityWithGemini } from "@/lib/ingestion/gemini-opportunity-service";
import {
    createOpportunity,
    publishOpportunity,
    detectDuplicateOpportunity,
    type OpportunitySource,
} from "@/services/opportunityService";
import { emitSystemEvent } from "@/lib/mission-control";

// ──────────────────────────────────────────────────────────────────────────────
// Crawl & Ingest Opportunity Source
// ──────────────────────────────────────────────────────────────────────────────

export async function crawlOpportunitySource(sourceId: string) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) throw new Error("Supabase admin client unavailable");

    const { data: source, error } = await supabase
        .from("opportunity_ingestion_sources")
        .select("*")
        .eq("id", sourceId)
        .single();

    if (error || !source) {
        throw new Error(`Source not found: ${sourceId}`);
    }

    const connector = getConnector(source.connector_type);
    const discovered = await connector.discoverJobs(source);

    let newCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (const ref of discovered) {
        try {
            const fetched = await connector.fetchJob(ref, source);
            if (!fetched.rawContent || fetched.checksum === "EXPIRED_SKIP") continue;

            // ── 1. Check raw payload dedup & insert into ingested_opportunity_raw_payloads (if table exists) ──
            const urlHash = crypto.createHash("md5").update(ref.url).digest("hex");
            let rawPayloadId: string | null = null;

            const { data: existingQueued } = await supabase
                .from("ingested_opportunities_queue")
                .select("id")
                .eq("source_url_hash", urlHash)
                .maybeSingle();

            if (existingQueued) {
                duplicateCount++;
                continue;
            }

            // Try inserting into dedicated opportunity raw payloads table if available
            try {
                const { data: rawPayload } = await supabase
                    .from("ingested_opportunity_raw_payloads")
                    .insert({
                        source_id: source.id,
                        external_id: ref.externalId,
                        url: ref.url,
                        payload: fetched.rawContent,
                        content_type: fetched.contentType,
                        checksum: fetched.checksum,
                        processing_status: "PENDING",
                    })
                    .select("id")
                    .maybeSingle();

                if (rawPayload) {
                    rawPayloadId = rawPayload.id;
                }
            } catch {
                // If table doesn't exist yet, proceed gracefully using queue dedup
            }

            // ── 2. Gemini AI Parse ──
            const parsed = await parseOpportunityWithGemini(fetched.rawContent, ref.url, fetched.checksum);

            if (!parsed || !parsed.title) {
                console.warn(`[OpportunityIngestion] Gemini returned no title for ${ref.url}`);
                if (rawPayloadId) {
                    await supabase
                        .from("ingested_opportunity_raw_payloads")
                        .update({ processing_status: "FAILED", error_log: "Gemini returned no title or low confidence" })
                        .eq("id", rawPayloadId);
                }
                errorCount++;
                continue;
            }

            // Check for semantic duplicates in published opportunities
            const duplicateCheck = await detectDuplicateOpportunity({
                title: parsed.title,
                organization_name: parsed.organization_name || "Unknown Organization",
                deadline: parsed.deadline || undefined,
            });

            const status = duplicateCheck.isDuplicate ? "DUPLICATE" : "PENDING_REVIEW";

            const { error: queueErr } = await supabase.from("ingested_opportunities_queue").insert({
                raw_payload_id: rawPayloadId,
                source_id: source.id,
                title: parsed.title,
                organization_name: parsed.organization_name || "Unknown Organization",
                description: parsed.description || parsed.short_description || parsed.title,
                short_description: parsed.short_description || parsed.title,
                category: parsed.category || "SCHOLARSHIP",
                country: parsed.country || "Global",
                location_type: (parsed.country || "").toLowerCase() === "global" ? "GLOBAL" : "IN_PERSON",
                application_url: parsed.application_url || ref.url,
                deadline: parsed.deadline || null,
                eligibility_requirements: parsed.eligibility_requirements || null,
                education_requirements: parsed.education_requirements || null,
                experience_years_min: parsed.experience_years_min || 0,
                funding_type: parsed.funding_type || "FULL_FUNDING",
                funding_amount: parsed.funding_amount || null,
                target_regions: parsed.target_regions || ["GLOBAL"],
                host_institutions: parsed.host_institutions || [],
                gender_eligibility: parsed.gender_eligibility || "ANY",
                overall_confidence: parsed.confidence_score || 80,
                status,
                source_url_hash: urlHash,
                duplicate_of_opportunity_id: duplicateCheck.isDuplicate ? duplicateCheck.existingId : null,
                duplicate_similarity: duplicateCheck.confidence,
            });

            if (queueErr) {
                console.error(`[OpportunityIngestion] Queue insert failed for "${parsed.title}":`, queueErr.message);
                if (rawPayloadId) {
                    await supabase
                        .from("ingested_opportunity_raw_payloads")
                        .update({ processing_status: "FAILED", error_log: queueErr.message })
                        .eq("id", rawPayloadId);
                }
                errorCount++;
                continue;
            }

            if (rawPayloadId) {
                await supabase
                    .from("ingested_opportunity_raw_payloads")
                    .update({ processing_status: "PARSED", parsed_at: new Date().toISOString() })
                    .eq("id", rawPayloadId);
            }

            newCount++;

        } catch (itemErr: any) {
            console.error(`[OpportunityIngestion] Error processing ref ${ref.url}:`, itemErr.message);
            errorCount++;
        }
    }

    // Update source last crawl timestamp
    await supabase
        .from("opportunity_ingestion_sources")
        .update({
            last_crawl_at: new Date().toISOString(),
            last_success_at: new Date().toISOString(),
            total_jobs_ingested: (source.total_jobs_ingested || 0) + newCount,
        })
        .eq("id", source.id);

    await emitSystemEvent({
        category: "AUTOMATION",
        severity: newCount > 0 ? "SUCCESS" : "INFO",
        event: "OPPORTUNITY_INGESTION_CRAWL_COMPLETED",
        message: `Crawl completed for ${source.name}: ${newCount} new, ${duplicateCount} duplicates, ${errorCount} errors`,
        metadata: { sourceId, sourceName: source.name, newCount, duplicateCount, errorCount },
    });

    return { newCount, duplicateCount, errorCount };
}

// ──────────────────────────────────────────────────────────────────────────────
// Fetch Staged Opportunities Queue
// ──────────────────────────────────────────────────────────────────────────────

export async function getStagedOpportunitiesQueue(status = "PENDING_REVIEW") {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return [];

    let query = supabase
        .from("ingested_opportunities_queue")
        .select(`
            *,
            source:opportunity_ingestion_sources(name, slug)
        `)
        .order("created_at", { ascending: false });

    if (status !== "ALL") {
        query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
        console.error("[OpportunityIngestion] Fetch queue error:", error);
        return [];
    }

    return data || [];
}

export async function getStagedOpportunityById(id: string) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return null;

    const { data, error } = await supabase
        .from("ingested_opportunities_queue")
        .select(`
            *,
            source:opportunity_ingestion_sources(name, slug)
        `)
        .eq("id", id)
        .maybeSingle();

    if (error) {
        console.error("[OpportunityIngestion] Fetch staged item error:", error);
        return null;
    }

    return data;
}

const STAGED_EDITABLE_FIELDS = [
    "title",
    "organization_name",
    "description",
    "short_description",
    "category",
    "country",
    "location_type",
    "application_url",
    "contact_email",
    "deadline",
    "eligibility_requirements",
    "education_requirements",
    "required_skills",
    "required_certifications",
    "age_min",
    "age_max",
    "experience_years_min",
    "funding_type",
    "funding_amount",
    "target_regions",
    "host_institutions",
    "gender_eligibility",
] as const;

export type StagedOpportunityUpdatePayload = Partial<{
    title: string;
    organization_name: string;
    description: string;
    short_description: string | null;
    category: string;
    country: string | null;
    location_type: string;
    application_url: string;
    contact_email: string | null;
    deadline: string | null;
    eligibility_requirements: string | null;
    education_requirements: string | null;
    required_skills: string[];
    required_certifications: string[];
    age_min: number | null;
    age_max: number | null;
    experience_years_min: number;
    funding_type: string;
    funding_amount: string | null;
    target_regions: string[];
    host_institutions: string[];
    gender_eligibility: string;
}>;

export async function updateStagedOpportunity(id: string, payload: StagedOpportunityUpdatePayload) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) throw new Error("Supabase admin client unavailable");

    const updates: Record<string, unknown> = {};
    for (const key of STAGED_EDITABLE_FIELDS) {
        if (key in payload) {
            updates[key] = payload[key];
        }
    }

    if (Object.keys(updates).length === 0) {
        throw new Error("No valid fields to update");
    }

    const { data, error } = await supabase
        .from("ingested_opportunities_queue")
        .update(updates)
        .eq("id", id)
        .select(`
            *,
            source:opportunity_ingestion_sources(name, slug)
        `)
        .single();

    if (error) throw new Error(`Failed to update staged opportunity: ${error.message}`);
    return data;
}

export type StagedApprovalOptions = {
    publish?: boolean;
    featured?: boolean;
    slug?: string;
    organization_logo?: string;
    source?: OpportunitySource;
    weight_education?: number;
    weight_certifications?: number;
    weight_skills?: number;
    weight_location?: number;
};

// ──────────────────────────────────────────────────────────────────────────────
// Approve Staged Opportunity (publish or keep as draft)
// ──────────────────────────────────────────────────────────────────────────────

export async function approveStagedOpportunity(
    stagedId: string,
    adminId: string,
    options: StagedApprovalOptions = {}
) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) throw new Error("Supabase admin client unavailable");

    const { data: staged, error } = await supabase
        .from("ingested_opportunities_queue")
        .select("*")
        .eq("id", stagedId)
        .single();

    if (error || !staged) throw new Error("Staged opportunity item not found");

    if (staged.status === "APPROVED" && staged.published_opportunity_id) {
        throw new Error("This ingested opportunity has already been approved.");
    }

    if (staged.status === "REJECTED") {
        throw new Error("Rejected items cannot be approved.");
    }

    const rawSlug = (options.slug || `${staged.title}-${staged.organization_name}`)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
    const slug = `${rawSlug}-${crypto.randomBytes(3).toString("hex")}`;

    const draftOpp = await createOpportunity({
        title: staged.title,
        slug,
        category: staged.category,
        organization_name: staged.organization_name,
        organization_logo: options.organization_logo || undefined,
        description: staged.description,
        short_description: staged.short_description || staged.title,
        country: staged.country,
        location_type: staged.location_type || "GLOBAL",
        application_url: staged.application_url,
        contact_email: staged.contact_email || undefined,
        deadline: staged.deadline,
        eligibility_requirements: staged.eligibility_requirements,
        education_requirements: staged.education_requirements,
        required_skills: staged.required_skills || [],
        required_certifications: staged.required_certifications || [],
        age_min: staged.age_min ?? undefined,
        age_max: staged.age_max ?? undefined,
        experience_years_min: staged.experience_years_min ?? 0,
        funding_type: staged.funding_type,
        funding_amount: staged.funding_amount,
        target_regions: staged.target_regions || ["GLOBAL"],
        host_institutions: staged.host_institutions || [],
        gender_eligibility: staged.gender_eligibility || "ANY",
        weight_education: options.weight_education,
        weight_certifications: options.weight_certifications,
        weight_skills: options.weight_skills,
        weight_location: options.weight_location,
        source: options.source || "RSS_API",
        created_by_admin: adminId,
    });

    const shouldPublish = options.publish !== false;
    const opportunity = shouldPublish
        ? await publishOpportunity(draftOpp.id, options.featured ?? false, adminId)
        : draftOpp;

    await supabase
        .from("ingested_opportunities_queue")
        .update({
            status: "APPROVED",
            reviewed_by: adminId,
            reviewed_at: new Date().toISOString(),
            published_opportunity_id: opportunity.id,
        })
        .eq("id", stagedId);

    return opportunity;
}

// ──────────────────────────────────────────────────────────────────────────────
// Reject Staged Opportunity
// ──────────────────────────────────────────────────────────────────────────────

export async function rejectStagedOpportunity(stagedId: string, adminId: string, reason?: string) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) throw new Error("Supabase admin client unavailable");

    const { error } = await supabase
        .from("ingested_opportunities_queue")
        .update({
            status: "REJECTED",
            reviewed_by: adminId,
            reviewed_at: new Date().toISOString(),
            rejection_reason: reason || "Admin rejected",
        })
        .eq("id", stagedId);

    if (error) throw new Error(`Reject failed: ${error.message}`);
    return true;
}
