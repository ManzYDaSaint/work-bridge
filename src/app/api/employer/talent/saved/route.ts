import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const auth = await validateAuth();
    if (auth.error) return auth.error;
    if (auth.role !== "EMPLOYER" && auth.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();
    
    const { data: savedRecords, error } = await supabase
        .from("employer_saved_candidates")
        .select(`
            id,
            created_at,
            job_seekers (
                id,
                full_name,
                bio,
                location,
                skills,
                avatar_url,
                seniority_level,
                employment_type,
                search_intent,
                profile_visibility
            )
        `)
        .eq("employer_id", auth.userId)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: "Failed to fetch saved candidates" }, { status: 500 });
    }

    // Mask anonymous candidates
    const mapped = (savedRecords || []).map((record: any) => {
        const seeker = record.job_seekers;
        if (!seeker) return null;
        
        const isAnonymous = seeker.profile_visibility === "ANONYMOUS";
        return {
            saved_id: record.id,
            saved_at: record.created_at,
            seeker: {
                id: seeker.id,
                full_name: isAnonymous ? "Anonymous Candidate" : seeker.full_name,
                bio: seeker.bio,
                location: isAnonymous ? null : seeker.location,
                skills: seeker.skills || [],
                avatar_url: isAnonymous ? null : seeker.avatar_url,
                seniority_level: seeker.seniority_level,
                employment_type: seeker.employment_type,
                search_intent: seeker.search_intent,
                profile_visibility: seeker.profile_visibility
            }
        };
    }).filter(Boolean);

    return NextResponse.json(mapped);
}
