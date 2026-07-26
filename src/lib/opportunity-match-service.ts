import { createNotification } from "./notifications";
import { getSupabaseAdminClient } from "./supabase-admin";
import { emitSystemEvent } from "./mission-control";
import { generateEmbedding, constructOpportunityDNA } from "./embedding-service";

/**
 * Generates an embedding for an opportunity and stores it in the DB.
 * Call this immediately after creating an opportunity (fire-and-forget safe).
 */
export async function generateOpportunityEmbedding(opportunityId: string) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
        console.error("[OPP_MATCH] FAILED: Admin client not initialized.");
        return;
    }

    try {
        const { data: opp, error: oppError } = await supabase
            .from("opportunities")
            .select("*")
            .eq("id", opportunityId)
            .single();

        if (oppError || !opp) {
            console.error(`[OPP_MATCH] Could not fetch opportunity ${opportunityId}:`, oppError);
            return;
        }

        const dna = constructOpportunityDNA(opp);
        const embedding = await generateEmbedding(dna);

        await supabase
            .from("opportunities")
            .update({ embedding })
            .eq("id", opportunityId);

        console.log(`[OPP_MATCH] Embedding generated for opportunity: ${opp.title}`);

        await emitSystemEvent({
            category: "OPPORTUNITY_MANAGEMENT",
            severity: "SUCCESS",
            event: "OPPORTUNITY_EMBEDDING_GENERATED",
            message: `AI embedding generated for opportunity: ${opp.title}`,
            metadata: { opportunityId, title: opp.title },
        });
    } catch (err: any) {
        console.error("[OPP_MATCH] Embedding generation failed:", err);
        await emitSystemEvent({
            category: "OPPORTUNITY_MANAGEMENT",
            severity: "WARNING",
            event: "OPPORTUNITY_EMBEDDING_FAILED",
            message: `Failed to generate embedding for opportunity ${opportunityId}`,
            metadata: { opportunityId, error: err.message },
        });
    }
}

/**
 * Core AI matching function for opportunities.
 *
 * Strategy:
 * 1. Vector similarity — semantic match between opportunity DNA and seeker DNA
 * 2. Structured scoring — exact field matching for education, skills, certs, location
 * 3. Weighted blend — using opportunity-specific weights from the admin form
 *
 * SAFETY: Designed for fire-and-forget. Never throws to the caller.
 */
export async function triggerOpportunityMatchNotifications(opportunityId: string) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
        console.error("[OPP_MATCH] FAILED: Admin client not initialized.");
        return;
    }

    try {
        // 1. Fetch the opportunity
        const { data: opp, error: oppError } = await supabase
            .from("opportunities")
            .select("*")
            .eq("id", opportunityId)
            .single();

        if (oppError || !opp) {
            console.error(`[OPP_MATCH] Could not fetch opportunity ${opportunityId}:`, oppError);
            return;
        }

        if (!opp.embedding) {
            console.warn(`[OPP_MATCH] Opportunity ${opportunityId} has no embedding. Run generateOpportunityEmbedding first.`);
            return;
        }

        console.log(`[OPP_MATCH] Starting AI match scan for: ${opp.title}`);

        await emitSystemEvent({
            category: "OPPORTUNITY_MANAGEMENT",
            severity: "INFO",
            event: "OPPORTUNITY_MATCHING_STARTED",
            message: `AI matching started for opportunity: ${opp.title}`,
            metadata: { opportunityId, title: opp.title },
        });

        // 2. Vector similarity search using existing match_candidates RPC
        const { data: semanticMatches, error: rpcError } = await supabase.rpc("match_candidates", {
            query_embedding: opp.embedding,
            match_threshold: 0.20,   // slightly lower than jobs — broader funnel
            match_count: 200,
        });

        if (rpcError) {
            console.error("[OPP_MATCH] RPC error:", rpcError);
            return;
        }

        if (!semanticMatches || semanticMatches.length === 0) {
            console.log(`[OPP_MATCH] No semantic matches found for opportunity ${opportunityId}.`);
            return;
        }

        const seekerIds = semanticMatches.map((m: any) => m.id);

        // 3. Fetch full seeker profiles for structured scoring
        const { data: seekers } = await supabase
            .from("job_seekers")
            .select(`
                id,
                skills,
                certifications,
                qualification,
                location,
                experience,
                user:users(plan, email)
            `)
            .in("id", seekerIds);

        if (!seekers || seekers.length === 0) return;

        // 4. Score each seeker
        const matchRecords: any[] = [];
        const notificationTargets: Array<{ userId: string; score: number }> = [];

        for (const seeker of seekers) {
            const semanticEntry = semanticMatches.find((m: any) => m.id === seeker.id);
            const semanticScore = semanticEntry?.similarity ?? 0; // 0.0–1.0

            const { score, reason, breakdown } = scoreOpportunityMatch(
                seeker,
                opp,
                semanticScore
            );

            if (score < 40) continue; // Only keep meaningful matches

            matchRecords.push({
                opportunity_id: opportunityId,
                job_seeker_id: seeker.id,
                match_score: score,
                match_reason: reason,
                match_breakdown: breakdown,
                status: "PENDING",
            });

            notificationTargets.push({ userId: seeker.id, score });
        }

        // 5. Upsert match records (idempotent — safe to re-run)
        if (matchRecords.length > 0) {
            await supabase
                .from("opportunity_matches")
                .upsert(matchRecords, { onConflict: "opportunity_id,job_seeker_id" });
        }

        console.log(`[OPP_MATCH] Stored ${matchRecords.length} match records for ${opp.title}.`);

        await emitSystemEvent({
            category: "OPPORTUNITY_MANAGEMENT",
            severity: "SUCCESS",
            event: "OPPORTUNITY_MATCHING_COMPLETED",
            message: `AI matching completed for: ${opp.title}. ${matchRecords.length} candidates matched.`,
            metadata: {
                opportunityId,
                title: opp.title,
                candidatesEvaluated: semanticMatches.length,
                matchesGenerated: matchRecords.length,
            },
        });

        // 6. Send in-app notifications
        const notifications = notificationTargets.map(({ userId, score }) =>
            createNotification({
                userId,
                type: "OPPORTUNITY_MATCH",
                templateVars: {
                    opportunityTitle: opp.title,
                    organization: opp.organization_name,
                    matchScore: score,
                },
                link: `/dashboard/seeker/opportunities`,
            }).catch((err: any) =>
                console.warn(`[OPP_MATCH] Notification failed for user ${userId}:`, err)
            )
        );

        await Promise.all(notifications);

        await emitSystemEvent({
            category: "OPPORTUNITY_MANAGEMENT",
            severity: "SUCCESS",
            event: "OPPORTUNITY_NOTIFICATIONS_SENT",
            message: `Sent ${notifications.length} opportunity match notifications for: ${opp.title}`,
            metadata: {
                opportunityId,
                title: opp.title,
                notificationCount: notifications.length,
            },
        });

    } catch (err: any) {
        console.error("[OPP_MATCH] Unexpected error:", err);
        await emitSystemEvent({
            category: "OPPORTUNITY_MANAGEMENT",
            severity: "CRITICAL",
            event: "OPPORTUNITY_MATCHING_FAILED",
            message: `Opportunity matching failed for ${opportunityId}`,
            metadata: { opportunityId, error: err.message },
        });
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Structured + Semantic Scoring Engine
// ──────────────────────────────────────────────────────────────────────────────

interface MatchResult {
    score: number;
    reason: string;
    breakdown: Record<string, any>;
}

function scoreOpportunityMatch(
    seeker: any,
    opportunity: any,
    semanticSimilarity: number  // 0.0–1.0 from pgvector cosine
): MatchResult {
    const weights = {
        education: opportunity.weight_education ?? 40,
        certifications: opportunity.weight_certifications ?? 30,
        skills: opportunity.weight_skills ?? 20,
        location: opportunity.weight_location ?? 10,
    };

    const breakdown: Record<string, any> = {};
    let weightedScore = 0;

    // ── Education match ───────────────────────────────────────────────────────
    let educationScore = 0;
    if (opportunity.education_requirements) {
        const req = opportunity.education_requirements.toLowerCase();
        const seekerQual = (seeker.qualification || "").toLowerCase();
        educationScore = seekerQual.includes(req) || req === "any" ? 100 : 40; // partial credit if not exact
    } else {
        educationScore = 100; // no requirement = full points
    }
    breakdown.education = { score: educationScore, requirement: opportunity.education_requirements };
    weightedScore += (educationScore / 100) * weights.education;

    // ── Certification match ───────────────────────────────────────────────────
    let certScore = 0;
    const requiredCerts: string[] = opportunity.required_certifications || [];
    const seekerCerts: string[] = (seeker.certifications || []).map((c: string) => c.toLowerCase());

    if (requiredCerts.length === 0) {
        certScore = 100;
    } else {
        const matched = requiredCerts.filter(c =>
            seekerCerts.some(sc => sc.includes(c.toLowerCase()))
        );
        certScore = Math.round((matched.length / requiredCerts.length) * 100);
        breakdown.certifications = { matched, required: requiredCerts, score: certScore };
    }
    weightedScore += (certScore / 100) * weights.certifications;

    // ── Skills match ──────────────────────────────────────────────────────────
    let skillScore = 0;
    const requiredSkills: string[] = opportunity.required_skills || [];
    const seekerSkills: string[] = (seeker.skills || []).map((s: string) => s.toLowerCase());

    if (requiredSkills.length === 0) {
        // Fall back to semantic similarity for skills dimension
        skillScore = Math.round(semanticSimilarity * 100);
    } else {
        const matched = requiredSkills.filter(s =>
            seekerSkills.some(ss => ss.includes(s.toLowerCase()))
        );
        skillScore = Math.round((matched.length / requiredSkills.length) * 100);
        breakdown.skills = { matched, required: requiredSkills, score: skillScore };
    }
    weightedScore += (skillScore / 100) * weights.skills;

    // ── Location match ────────────────────────────────────────────────────────
    let locationScore = 0;
    if (!opportunity.country || opportunity.location_type === "GLOBAL" || opportunity.location_type === "REMOTE") {
        locationScore = 100;
    } else {
        const seekerLoc = (seeker.location || "").toLowerCase();
        const oppCountry = (opportunity.country || "").toLowerCase();
        locationScore = seekerLoc.includes(oppCountry) || oppCountry.includes(seekerLoc) ? 100 : 30;
    }
    breakdown.location = { score: locationScore, country: opportunity.country };
    weightedScore += (locationScore / 100) * weights.location;

    const finalScore = Math.min(100, Math.round(weightedScore));

    // ── Human-readable match reason ───────────────────────────────────────────
    const reasons: string[] = [];
    if (educationScore >= 80) reasons.push("✓ Education qualification matches");
    if (certScore >= 60) reasons.push(`✓ ${breakdown.certifications?.matched?.length ?? 0}/${requiredCerts.length || 0} certifications matched`);
    if (skillScore >= 60) reasons.push(`✓ Key skills align`);
    if (locationScore === 100) reasons.push("✓ Location requirement satisfied");

    const reason = reasons.length > 0
        ? `${finalScore}% match because: ${reasons.join(". ")}.`
        : `${finalScore}% match based on overall profile alignment.`;

    return { score: finalScore, reason, breakdown };
}
