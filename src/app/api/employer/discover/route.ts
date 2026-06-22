import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const auth = await validateAuth(["EMPLOYER", "ADMIN"], false, true);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const skillsParam = searchParams.get("skills");
    const intentParam = searchParams.get("intent");
    const seniorityParam = searchParams.get("seniority");
    const locationParam = searchParams.get("location");
    const qualificationParam = searchParams.get("qualification");
    const hasResumeParam = searchParams.get("hasResume");

    const supabase = await createSupabaseServerClient();

    let query = supabase
        .from("job_seekers")
        .select(`
            id,
            full_name,
            bio,
            location,
            skills,
            experience,
            education,
            qualification,
            avatar_url,
            seniority_level,
            employment_type,
            employment_status,
            search_intent,
            profile_visibility,
            portfolio_links,
            resume_url
        `)
        .in("profile_visibility", ["PUBLIC", "ANONYMOUS"])
        .order("created_at", { ascending: false });

    // Filtering
    if (intentParam && intentParam !== "ALL") {
        query = query.eq("search_intent", intentParam);
    }
    
    if (seniorityParam && seniorityParam !== "ALL") {
        query = query.eq("seniority_level", seniorityParam);
    }

    if (locationParam && locationParam.trim()) {
        query = query.ilike("location", `%${locationParam.trim()}%`);
    }

    if (qualificationParam && qualificationParam !== "ALL") {
        query = query.ilike("qualification", `%${qualificationParam}%`);
    }

    if (hasResumeParam === "true") {
        query = query.not("resume_url", "is", null);
    }

    if (skillsParam) {
        const keywords = skillsParam
            .split(",")
            .map((s) => s.trim().replace(/[^a-zA-Z0-9\s\-]/g, " "))
            .filter(Boolean)
            .slice(0, 5);

        if (keywords.length > 0) {
            const orConditions = keywords.map((kw) =>
                `full_name.ilike.%${kw}%,bio.ilike.%${kw}%,skills.cs.{"${kw}"}`
            );
            query = query.or(orConditions.join(","));
        }
    }

    const { data: seekers, error } = await query;

    if (error) {
        console.error("Employer Discover error:", error);
        return NextResponse.json({ error: "Failed to fetch talent pool" }, { status: 500 });
    }

    // Fetch saved candidate IDs for this employer
    const { data: savedList } = await supabase
        .from("employer_saved_candidates")
        .select("seeker_id")
        .eq("employer_id", auth.userId);
        
    const savedIds = new Set((savedList || []).map((s: any) => s.seeker_id));

    // Mask anonymous profiles
    const processedSeekers = (seekers || []).map((seeker) => {
        const isSaved = savedIds.has(seeker.id);
        if (seeker.profile_visibility === "ANONYMOUS") {
            return {
                ...seeker,
                is_saved: isSaved,
                full_name: "Anonymous Candidate",
                avatar_url: null,
                location: seeker.location ? "Location Hidden" : null,
                portfolio_links: [],
                resume_url: null,
            };
        }
        return {
            ...seeker,
            is_saved: isSaved
        };
    });

    const response = NextResponse.json({ seekers: processedSeekers });
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
}
