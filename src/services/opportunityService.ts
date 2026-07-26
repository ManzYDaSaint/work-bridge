/**
 * Opportunity Service
 *
 * Server-side data access layer for the Opportunities module.
 * Mirrors the pattern of src/services/jobService.ts.
 *
 * All write operations are Admin-only and emit Mission Control events.
 */

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { emitSystemEvent } from "@/lib/mission-control";
import { emitEvent } from "@/lib/automation/event-bus";
import { generateOpportunityEmbedding } from "@/lib/opportunity-match-service";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type OpportunityCategory =
    | "SCHOLARSHIP"
    | "GRANT"
    | "FUNDING"
    | "TRAINING"
    | "CERTIFICATION"
    | "FELLOWSHIP"
    | "INTERNSHIP"
    | "CAREER_PROGRAM";

export type OpportunityStatus =
    | "DRAFT"
    | "PUBLISHED"
    | "FEATURED"
    | "CLOSING_SOON"
    | "EXPIRED"
    | "ARCHIVED";

export type OpportunityLocationType = "REMOTE" | "IN_PERSON" | "HYBRID" | "GLOBAL";
export type OpportunityFundingType =
    | "FULL_FUNDING"
    | "PARTIAL_FUNDING"
    | "STIPEND"
    | "UNPAID"
    | "NOT_APPLICABLE";

export type OpportunitySource =
    | "MANUAL"
    | "ORGANIZATION_WEBSITE"
    | "UNIVERSITY"
    | "GOVERNMENT"
    | "NGO"
    | "LINKEDIN"
    | "PARTNER"
    | "RSS_API";

export interface OpportunityCreatePayload {
    title: string;
    slug: string;
    category: OpportunityCategory;
    organization_name: string;
    organization_logo?: string;
    description: string;
    short_description: string;
    country?: string;
    location_type: OpportunityLocationType;
    application_url: string;
    contact_email?: string;
    deadline?: string;                      // ISO 8601 date string
    eligibility_requirements?: string;
    education_requirements?: string;
    required_skills?: string[];
    required_certifications?: string[];
    age_min?: number;
    age_max?: number;
    experience_years_min?: number;
    funding_type: OpportunityFundingType;
    funding_amount?: string;
    weight_education?: number;
    weight_certifications?: number;
    weight_skills?: number;
    weight_location?: number;
    source?: OpportunitySource;
    created_by_admin: string;               // admin user.id
}

export interface OpportunityUpdatePayload extends Partial<OpportunityCreatePayload> {
    status?: OpportunityStatus;
    featured?: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// Duplicate Opportunity Detection (#5)
// ──────────────────────────────────────────────────────────────────────────────

export async function detectDuplicateOpportunity(opts: {
    title: string;
    organization_name: string;
    deadline?: string;
    excludeId?: string;
}) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return false;

    let query = supabase
        .from("opportunities")
        .select("id, title, organization_name, deadline")
        .ilike("title", `%${opts.title.trim()}%`)
        .ilike("organization_name", `%${opts.organization_name.trim()}%`);

    if (opts.excludeId) {
        query = query.neq("id", opts.excludeId);
    }

    const { data } = await query;
    const isDuplicate = !!(data && data.length > 0);

    if (isDuplicate) {
        await emitSystemEvent({
            category: "OPPORTUNITY_MANAGEMENT",
            severity: "WARNING",
            event: "DUPLICATE_OPPORTUNITY_DETECTED",
            message: `Possible duplicate opportunity detected: "${opts.title}" by ${opts.organization_name}`,
            metadata: { title: opts.title, organization: opts.organization_name, matches: data },
        });
    }

    return isDuplicate;
}

// ──────────────────────────────────────────────────────────────────────────────
// Reads
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Returns all opportunities visible to the public (PUBLISHED, FEATURED, CLOSING_SOON).
 */
export async function getPublicOpportunities(opts?: {
    category?: OpportunityCategory;
    limit?: number;
    offset?: number;
}) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return [];

    let query = supabase
        .from("opportunities")
        .select(
            "id, title, slug, category, organization_name, organization_logo, short_description, " +
            "country, location_type, application_url, deadline, funding_type, funding_amount, " +
            "status, featured, published_at, source"
        )
        .in("status", ["PUBLISHED", "FEATURED", "CLOSING_SOON"])
        .order("featured", { ascending: false })
        .order("published_at", { ascending: false });

    if (opts?.category) query = query.eq("category", opts.category);
    if (opts?.limit) query = query.limit(opts.limit);
    if (opts?.offset) query = query.range(opts.offset, (opts.offset + (opts.limit ?? 20)) - 1);

    const { data } = await query;
    return data ?? [];
}

/**
 * Returns a single public opportunity by its slug.
 */
export async function getOpportunityBySlug(slug: string) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return null;

    const { data } = await supabase
        .from("opportunities")
        .select("*")
        .eq("slug", slug)
        .in("status", ["PUBLISHED", "FEATURED", "CLOSING_SOON"])
        .single();

    return data;
}

/**
 * Returns all opportunities for the Admin panel (all statuses).
 */
export async function getAllOpportunitiesAdmin(opts?: { limit?: number; offset?: number }) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return [];

    let query = supabase
        .from("opportunities")
        .select(
            "id, title, slug, category, organization_name, status, featured, deadline, " +
            "created_at, published_at, created_by_admin, source"
        )
        .order("created_at", { ascending: false });

    if (opts?.limit) query = query.limit(opts.limit);
    if (opts?.offset) query = query.range(opts.offset, (opts.offset + (opts.limit ?? 50)) - 1);

    const { data } = await query;
    return data ?? [];
}

/**
 * Returns opportunity matches for a given job seeker (for the candidate dashboard).
 */
export async function getSeekerOpportunityMatches(jobSeekerId: string) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return [];

    const { data } = await supabase
        .from("opportunity_matches")
        .select(`
            id,
            match_score,
            match_reason,
            match_breakdown,
            status,
            created_at,
            opportunity:opportunities(
                id, title, slug, category, organization_name, organization_logo,
                short_description, deadline, application_url, funding_type,
                funding_amount, country, location_type, status, featured
            )
        `)
        .eq("job_seeker_id", jobSeekerId)
        .in("opportunity->status", ["PUBLISHED", "FEATURED", "CLOSING_SOON"])
        .order("match_score", { ascending: false })
        .limit(50);

    return data ?? [];
}

/**
 * Returns expanded aggregate & time-series analytics for Admin (#2).
 */
export async function getOpportunityAnalytics() {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return null;

    const [totalRes, matchesRes, viewsRes] = await Promise.all([
        supabase.from("opportunities").select("status, category", { count: "exact" }),
        supabase.from("opportunity_matches").select("match_score", { count: "exact" }),
        supabase.from("opportunity_views").select("id, apply_clicked, created_at, opportunity_id"),
    ]);

    const byStatus = {
        PUBLISHED: 0,
        FEATURED: 0,
        CLOSING_SOON: 0,
        EXPIRED: 0,
        DRAFT: 0,
        ARCHIVED: 0,
    } as Record<string, number>;

    const byCategory = {} as Record<string, number>;

    (totalRes.data ?? []).forEach((row: any) => {
        if (byStatus[row.status] !== undefined) byStatus[row.status]++;
        if (row.category) {
            byCategory[row.category] = (byCategory[row.category] || 0) + 1;
        }
    });

    const views = viewsRes.data ?? [];
    const totalViews = views.length;
    const totalApplyClicks = views.filter((v: any) => v.apply_clicked).length;
    const ctr = totalViews > 0 ? Number(((totalApplyClicks / totalViews) * 100).toFixed(1)) : 0;

    // Average match score
    const scores = (matchesRes.data ?? []).map((m: any) => m.match_score).filter(Boolean);
    const avgMatchScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    // Time window calculations (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentViews = views.filter(v => new Date(v.created_at) >= thirtyDaysAgo);
    const monthlyViews = recentViews.length;
    const monthlyApplyClicks = recentViews.filter(v => v.apply_clicked).length;

    return {
        total: totalRes.count ?? 0,
        byStatus,
        byCategory,
        totalMatches: matchesRes.count ?? 0,
        totalViews,
        totalApplyClicks,
        ctr,
        avgMatchScore,
        monthlyViews,
        monthlyApplyClicks,
    };
}

// ──────────────────────────────────────────────────────────────────────────────
// Expiry Automation Sweep (#3)
// ──────────────────────────────────────────────────────────────────────────────

export async function sweepExpiredOpportunities() {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return { processed: 0 };

    const now = new Date().toISOString();

    // 1. Fetch active opportunities past deadline
    const { data: expiredList } = await supabase
        .from("opportunities")
        .select("id, title")
        .in("status", ["PUBLISHED", "FEATURED", "CLOSING_SOON"])
        .lt("deadline", now);

    if (!expiredList || expiredList.length === 0) {
        return { processed: 0 };
    }

    const ids = expiredList.map(o => o.id);

    // 2. Transition status to EXPIRED
    await supabase
        .from("opportunities")
        .update({ status: "EXPIRED" })
        .in("id", ids);

    // 3. Log Mission Control events
    for (const opp of expiredList) {
        await emitSystemEvent({
            category: "OPPORTUNITY_MANAGEMENT",
            severity: "INFO",
            event: "OPPORTUNITY_EXPIRED",
            message: `Opportunity automatically expired past deadline: ${opp.title}`,
            metadata: { opportunityId: opp.id, title: opp.title },
        });
    }

    return { processed: ids.length, expiredIds: ids };
}

// ──────────────────────────────────────────────────────────────────────────────
// Writes (Admin-only — enforce in calling API route)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Creates a new opportunity in DRAFT status.
 * Triggers embedding generation in the background.
 */
export async function createOpportunity(payload: OpportunityCreatePayload) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) throw new Error("Admin client not initialized");

    const { data, error } = await supabase
        .from("opportunities")
        .insert({
            ...payload,
            source: payload.source || "MANUAL",
            status: "DRAFT",
            featured: false,
        })
        .select()
        .single();

    if (error) throw new Error(`Failed to create opportunity: ${error.message}`);

    await emitSystemEvent({
        category: "OPPORTUNITY_MANAGEMENT",
        severity: "INFO",
        event: "ADMIN_CREATED_OPPORTUNITY",
        message: `Admin created new opportunity: ${data.title}`,
        actorId: payload.created_by_admin,
        metadata: { opportunityId: data.id, title: data.title, category: data.category, source: data.source },
    });

    // Generate embedding in background — fire and forget
    generateOpportunityEmbedding(data.id).catch(console.error);

    return data;
}

/**
 * Updates an existing opportunity.
 * If title/description/requirements change, re-generates embedding.
 */
export async function updateOpportunity(
    opportunityId: string,
    payload: OpportunityUpdatePayload,
    adminId: string
) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) throw new Error("Admin client not initialized");

    const { data, error } = await supabase
        .from("opportunities")
        .update(payload)
        .eq("id", opportunityId)
        .select()
        .single();

    if (error) throw new Error(`Failed to update opportunity: ${error.message}`);

    await emitSystemEvent({
        category: "OPPORTUNITY_MANAGEMENT",
        severity: "INFO",
        event: "ADMIN_UPDATED_OPPORTUNITY",
        message: `Admin updated opportunity: ${data.title}`,
        actorId: adminId,
        metadata: { opportunityId, title: data.title, changes: Object.keys(payload) },
    });

    // Re-embed if content-bearing fields were changed
    const contentFields = ["title", "description", "eligibility_requirements", "education_requirements", "required_skills", "required_certifications"];
    const contentChanged = Object.keys(payload).some(k => contentFields.includes(k));
    if (contentChanged) {
        generateOpportunityEmbedding(opportunityId).catch(console.error);
    }

    return data;
}

/**
 * Publishes an opportunity (DRAFT → PUBLISHED or FEATURED).
 * Fires the OPPORTUNITY_PUBLISHED automation event which triggers
 * AI matching + optional social sharing.
 */
export async function publishOpportunity(
    opportunityId: string,
    featured: boolean,
    adminId: string
) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) throw new Error("Admin client not initialized");

    const newStatus: OpportunityStatus = featured ? "FEATURED" : "PUBLISHED";

    const { data, error } = await supabase
        .from("opportunities")
        .update({
            status: newStatus,
            featured,
            published_at: new Date().toISOString(),
        })
        .eq("id", opportunityId)
        .select()
        .single();

    if (error) throw new Error(`Failed to publish opportunity: ${error.message}`);

    await emitSystemEvent({
        category: "OPPORTUNITY_MANAGEMENT",
        severity: "SUCCESS",
        event: "ADMIN_PUBLISHED_OPPORTUNITY",
        message: `Admin published opportunity: ${data.title} [${newStatus}]`,
        actorId: adminId,
        metadata: { opportunityId, title: data.title, status: newStatus, featured },
    });

    // Fire automation event — queues opportunity-matcher + buffer-social-poster workers
    await emitEvent({
        type: "OPPORTUNITY_PUBLISHED",
        payload: { opportunityId, featured },
        priority: "HIGH",
    });

    return data;
}

/**
 * Archives an opportunity (removes it from public view).
 */
export async function archiveOpportunity(opportunityId: string, adminId: string) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) throw new Error("Admin client not initialized");

    const { data, error } = await supabase
        .from("opportunities")
        .update({ status: "ARCHIVED" })
        .eq("id", opportunityId)
        .select("id, title")
        .single();

    if (error) throw new Error(`Failed to archive opportunity: ${error.message}`);

    await emitSystemEvent({
        category: "OPPORTUNITY_MANAGEMENT",
        severity: "INFO",
        event: "ADMIN_ARCHIVED_OPPORTUNITY",
        message: `Admin archived opportunity: ${data.title}`,
        actorId: adminId,
        metadata: { opportunityId, title: data.title },
    });

    return data;
}

/**
 * Hard-deletes an opportunity. Only valid for DRAFT or ARCHIVED status.
 */
export async function deleteOpportunity(opportunityId: string, adminId: string) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) throw new Error("Admin client not initialized");

    // Fetch title first for audit log
    const { data: existing } = await supabase
        .from("opportunities")
        .select("id, title, status")
        .eq("id", opportunityId)
        .single();

    if (!existing) throw new Error("Opportunity not found");
    if (!["DRAFT", "ARCHIVED"].includes(existing.status)) {
        throw new Error("Only DRAFT or ARCHIVED opportunities can be deleted. Archive it first.");
    }

    const { error } = await supabase
        .from("opportunities")
        .delete()
        .eq("id", opportunityId);

    if (error) throw new Error(`Failed to delete opportunity: ${error.message}`);

    await emitSystemEvent({
        category: "OPPORTUNITY_MANAGEMENT",
        severity: "WARNING",
        event: "ADMIN_DELETED_OPPORTUNITY",
        message: `Admin permanently deleted opportunity: ${existing.title}`,
        actorId: adminId,
        metadata: { opportunityId, title: existing.title },
    });
}

/**
 * Tracks a page view or apply-click event for an opportunity.
 * Safe for anonymous users (userId is nullable).
 */
export async function recordOpportunityView(opts: {
    opportunityId: string;
    userId?: string;
    ipAddress?: string;
    applyClicked?: boolean;
}) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return;

    await supabase.from("opportunity_views").insert({
        opportunity_id: opts.opportunityId,
        user_id: opts.userId ?? null,
        ip_address: opts.ipAddress ?? null,
        apply_clicked: opts.applyClicked ?? false,
    });

    if (opts.applyClicked) {
        await emitSystemEvent({
            category: "OPPORTUNITY_MANAGEMENT",
            severity: "INFO",
            event: "OPPORTUNITY_APPLY_CLICKED",
            message: `Apply button clicked on opportunity ${opts.opportunityId}`,
            metadata: { opportunityId: opts.opportunityId, userId: opts.userId },
        });
    }
}
