/**
 * Aganyu Opportunity Ingestion Engine — Service Layer
 *
 * Handles:
 * 1. Source crawling & raw payload ingestion
 * 2. Gemini AI extraction into ingested_opportunities_queue
 * 3. Administrative approval, rejection, and publishing to public.opportunities
 */

import crypto from "crypto";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getConnector } from "@/lib/ingestion/connectors";
import { parseOpportunityWithGemini } from "@/lib/ingestion/gemini-opportunity-service";
import { createOpportunity, detectDuplicateOpportunity } from "@/services/opportunityService";
import { emitSystemEvent } from "@/lib/mission-control";

// ──────────────────────────────────────────────────────────────────────────────
// Crawl & Ingest Opportunity Source
// ──────────────────────────────────────────────────────────────────────────────

export async function crawlOpportunitySource(sourceId: string) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) throw new Error("Supabase admin client unavailable");

    const { data: source, error } = await supabase
        .from("job_ingestion_sources")
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

    for (const ref of discovered) {
        const fetched = await connector.fetchJob(ref, source);
        if (!fetched.rawContent || fetched.checksum === "EXPIRED_SKIP") continue;

        // Check if raw payload exists
        const { data: existingPayload } = await supabase
            .from("ingested_raw_payloads")
            .select("id")
            .eq("source_id", source.id)
            .eq("external_id", ref.externalId)
            .maybeSingle();

        if (existingPayload) {
            duplicateCount++;
            continue;
        }

        // Insert raw payload
        const { data: rawPayload, error: rawError } = await supabase
            .from("ingested_raw_payloads")
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
            .single();

        if (rawError || !rawPayload) {
            console.error(`[OpportunityIngestion] Failed raw payload insert:`, rawError);
            continue;
        }

        newCount++;

        // Process AI parsing
        const parsed = await parseOpportunityWithGemini(fetched.rawContent, ref.url, fetched.checksum);
        if (parsed && parsed.title) {
            // Check for duplicates in public.opportunities
            const duplicateCheck = await detectDuplicateOpportunity({
                title: parsed.title,
                organization_name: parsed.organization_name || "Unknown Organization",
                deadline: parsed.deadline || undefined,
            });

            const status = duplicateCheck.isDuplicate ? "DUPLICATE" : "PENDING_REVIEW";

            await supabase.from("ingested_opportunities_queue").insert({
                raw_payload_id: rawPayload.id,
                source_id: source.id,
                title: parsed.title,
                organization_name: parsed.organization_name || "Unknown Organization",
                description: parsed.description || parsed.short_description || parsed.title,
                short_description: parsed.short_description || parsed.title,
                category: parsed.category || "SCHOLARSHIP",
                country: parsed.country || "Global",
                location_type: parsed.country === "Global" ? "GLOBAL" : "IN_PERSON",
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
                duplicate_of_opportunity_id: duplicateCheck.isDuplicate ? duplicateCheck.existingId : null,
                duplicate_similarity: duplicateCheck.confidence,
            });

            await supabase
                .from("ingested_raw_payloads")
                .update({ processing_status: "PARSED", parsed_at: new Date().toISOString() })
                .eq("id", rawPayload.id);
        }
    }

    // Update source last crawl timestamp
    await supabase
        .from("job_ingestion_sources")
        .update({
            last_crawl_at: new Date().toISOString(),
            last_success_at: new Date().toISOString(),
            total_jobs_ingested: (source.total_jobs_ingested || 0) + newCount,
        })
        .eq("id", source.id);

    await emitSystemEvent({
        category: "AUTOMATION",
        severity: "INFO",
        event: "OPPORTUNITY_INGESTION_CRAWL_COMPLETED",
        message: `Crawl completed for ${source.name}: ${newCount} new opportunities, ${duplicateCount} duplicates`,
        metadata: { sourceId, newCount, duplicateCount },
    });

    return { newCount, duplicateCount };
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
            source:job_ingestion_sources(name, slug)
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

// ──────────────────────────────────────────────────────────────────────────────
// Approve & Publish Staged Opportunity
// ──────────────────────────────────────────────────────────────────────────────

export async function approveStagedOpportunity(stagedId: string, adminId: string) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) throw new Error("Supabase admin client unavailable");

    const { data: staged, error } = await supabase
        .from("ingested_opportunities_queue")
        .select("*")
        .eq("id", stagedId)
        .single();

    if (error || !staged) throw new Error("Staged opportunity item not found");

    // Generate clean unique slug
    const rawSlug = `${staged.title}-${staged.organization_name}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
    const slug = `${rawSlug}-${crypto.randomBytes(3).toString("hex")}`;

    // Publish into public.opportunities using existing opportunityService
    const opportunity = await createOpportunity({
        title: staged.title,
        slug,
        category: staged.category,
        organization_name: staged.organization_name,
        description: staged.description,
        short_description: staged.short_description || staged.title,
        country: staged.country,
        location_type: staged.location_type || "GLOBAL",
        application_url: staged.application_url,
        deadline: staged.deadline,
        eligibility_requirements: staged.eligibility_requirements,
        education_requirements: staged.education_requirements,
        funding_type: staged.funding_type,
        funding_amount: staged.funding_amount,
        target_regions: staged.target_regions || ["GLOBAL"],
        host_institutions: staged.host_institutions || [],
        gender_eligibility: staged.gender_eligibility || "ANY",
        source: "RSS_API",
        created_by_admin: adminId,
    });

    // Update staged record to APPROVED & link published opportunity ID
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
