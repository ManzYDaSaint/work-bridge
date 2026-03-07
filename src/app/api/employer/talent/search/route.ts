import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSemanticMatchScore } from "@/lib/ai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const auth = await validateAuth(["EMPLOYER"], true, true);
    if (auth.error) return auth.error;

    try {
        const { query } = await request.json();
        if (!query) return NextResponse.json({ error: "Search query is required" }, { status: 400 });

        const supabase = await createSupabaseServerClient();

        // 1. Fetch search-relevant talent data
        const { data: talent, error } = await supabase
            .from("job_seekers")
            .select(`
                id,
                anonymized_summary,
                top_verification_tier,
                skills,
                bio,
                location
            `)
            .not("anonymized_summary", "is", null);

        if (error) throw error;

        // 2. Rank talent using Semantic Matching
        const scoredTalent = await Promise.all(talent.map(async (t) => {
            const { score, justification } = await getSemanticMatchScore(
                t.skills || [],
                [], // No specific job skills, just the query vs profile
                t.bio || "",
                query, // We treat the search query as the "job description" for semantic matching
                [] // No verified certs for simplified search ranking for now
            );
            return {
                id: t.id,
                summary: t.anonymized_summary,
                tier: t.top_verification_tier,
                skills: t.skills || [],
                location: t.location,
                score,
                justification
            };
        }));

        // 3. Sort by score
        const results = scoredTalent
            .sort((a, b) => b.score - a.score)
            .slice(0, 10); // Return top 10

        return NextResponse.json(results);

    } catch (err: any) {
        console.error("Semantic search error:", err);
        return NextResponse.json({ error: "Failed to perform semantic search" }, { status: 500 });
    }
}
