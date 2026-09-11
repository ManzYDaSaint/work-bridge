import { validateAuth } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { constructSeekerDNA, generateEmbedding } from "@/lib/embedding-service";
import { recordAuditLog } from "@/lib/audit";
import { emitSystemEvent } from "@/lib/mission-control";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    try {
        const body = await request.json();
        const { action, userId, seekerId } = body;

        if (!action || !userId) {
            return NextResponse.json({ error: "Action and userId required" }, { status: 400 });
        }

        const supabase = getSupabaseAdminClient();
        if (!supabase) {
            return NextResponse.json({ error: "Database client unavailable" }, { status: 500 });
        }

        // Action 1: Refresh & Recalculate AI Embeddings for Job Seeker
        if (action === "RECALCULATE_EMBEDDING") {
            const effectiveSeekerId = seekerId || userId;
            const { data: seeker, error: seekerError } = await supabase
                .from("job_seekers")
                .select("*")
                .eq("id", effectiveSeekerId)
                .single();

            if (seekerError || !seeker) {
                return NextResponse.json({ error: "Job seeker profile not found" }, { status: 404 });
            }

            const dna = constructSeekerDNA(seeker);
            let embedding: number[] | null = null;
            try {
                embedding = await generateEmbedding(dna);
            } catch (err: any) {
                console.warn("[Admin Action] Remote embedding server unreachable fallback:", err?.message);
            }

            const updatePayload: any = { dna_hash: dna };
            if (embedding) updatePayload.embedding = embedding;

            await supabase
                .from("job_seekers")
                .update(updatePayload)
                .eq("id", effectiveSeekerId);

            await recordAuditLog({
                action: "users_RECALCULATE_EMBEDDING",
                path: "/api/admin/users/actions",
                method: "POST",
                statusCode: 200,
                userId: auth.user.id,
                metadata: { targetUserId: userId, seekerId: effectiveSeekerId, embeddingUpdated: !!embedding }
            });

            await emitSystemEvent({
                category: "USER",
                severity: "SUCCESS",
                event: "ADMIN_USER_EMBEDDING_REFRESHED",
                message: `Admin refreshed AI embedding for user ${userId}`,
                actorId: auth.user.id,
                metadata: { targetUserId: userId }
            });

            return NextResponse.json({
                success: true,
                message: embedding ? "AI profile embedding recalculation complete!" : "DNA hash updated (embedding engine offline)",
                embeddingUpdated: !!embedding
            });
        }

        // Action 2: Simulate Live Opportunity Match Search
        if (action === "SIMULATE_MATCHES") {
            const effectiveSeekerId = seekerId || userId;

            // Fetch top published opportunities
            const { data: opps } = await supabase
                .from("opportunities")
                .select("id, title, category, organization_name, country, location_type, status")
                .in("status", ["PUBLISHED", "FEATURED", "CLOSING_SOON"])
                .order("created_at", { ascending: false })
                .limit(10);

            // Fetch existing recorded matches
            const { data: matches } = await supabase
                .from("opportunity_matches")
                .select("id, match_score, match_reason, opportunity_id, created_at")
                .eq("job_seeker_id", effectiveSeekerId)
                .order("match_score", { ascending: false });

            return NextResponse.json({
                success: true,
                simulatedMatches: matches || [],
                availableOpportunities: opps || []
            });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error: any) {
        console.error("Admin user action error:", error);
        return NextResponse.json({ error: "Action failed", details: error?.message }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
