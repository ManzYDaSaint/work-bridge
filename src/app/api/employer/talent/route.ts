import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
    const auth = await validateAuth(["EMPLOYER"], true, true);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    // Fetch anonymized talent
    const { data: talent, error } = await supabase
        .from("job_seekers")
        .select(`
            id,
            anonymized_summary,
            top_verification_tier,
            skills,
            location
        `)
        .not("anonymized_summary", "is", null)
        .order("top_verification_tier", { ascending: false })
        .limit(20);

    if (error) {
        console.error("Talent fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch talent pool" }, { status: 500 });
    }

    // Check for active reveal requests for this employer
    const { data: reveals } = await supabase
        .from("profile_reveals")
        .select("seeker_id, status")
        .eq("employer_id", auth.userId);

    const revealMap = new Map(reveals?.map(r => [r.seeker_id, r.status]));

    const mappedTalent = talent.map(t => ({
        id: t.id,
        summary: t.anonymized_summary,
        tier: t.top_verification_tier,
        skills: t.skills || [],
        location: t.location,
        revealStatus: revealMap.get(t.id) || "NONE"
    }));

    return NextResponse.json(mappedTalent);
}
