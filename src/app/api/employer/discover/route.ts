import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const auth = await validateAuth(["EMPLOYER", "ADMIN"]);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const skillsParam = searchParams.get("skills");
    const intentParam = searchParams.get("intent");
    const seniorityParam = searchParams.get("seniority");

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
            search_intent,
            profile_visibility,
            portfolio_links
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

    if (skillsParam) {
        // Assume comma separated skills
        const skillsArray = skillsParam.split(",").map((s) => s.trim()).filter(Boolean);
        if (skillsArray.length > 0) {
            query = query.contains("skills", skillsArray);
        }
    }

    const { data: seekers, error } = await query;

    if (error) {
        console.error("Employer Discover error:", error);
        return NextResponse.json({ error: "Failed to fetch talent pool" }, { status: 500 });
    }

    // Mask anonymous profiles
    const processedSeekers = (seekers || []).map((seeker) => {
        if (seeker.profile_visibility === "ANONYMOUS") {
            return {
                ...seeker,
                full_name: "Anonymous Candidate",
                avatar_url: null,
                location: seeker.location ? "Location Hidden" : null,
                portfolio_links: [],
            };
        }
        return seeker;
    });

    const response = NextResponse.json({ seekers: processedSeekers });
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
}
