import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();
    const { data: profile, error } = await supabase
        .from("job_seekers")
        .select("*")
        .eq("id", auth.userId)
        .single();

    if (error && error.code !== "PGRST116") {
        console.error("Profile GET error:", error);
        return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }

    if (!profile) {
        const emptyResponse = NextResponse.json({
            full_name: "",
            bio: "",
            location: "",
            qualification: "",
            skills: [],
            completion: 0,
            hasBadge: false,
            avatarUrl: null,
            searchIntent: "ACTIVELY_LOOKING",
            profileVisibility: "HIDDEN",
            portfolioLinks: [],
        });
        emptyResponse.headers.set("Cache-Control", "no-store, max-age=0");
        return emptyResponse;
    }

    const response = NextResponse.json({
        id: profile.id,
        full_name: profile.full_name,
        bio: profile.bio,
        location: profile.location,
        phone: profile.phone,
        whatsapp: profile.whatsapp,
        qualification: profile.qualification,
        skills: profile.skills,
        salaryExpectation: profile.salary_expectation,
        seniorityLevel: profile.seniority_level,
        employmentType: profile.employment_type,
        experience: profile.experience || [],
        education: profile.education || [],
        completion: profile.completion,
        isSubscribed: profile.is_subscribed,
        has_badge: profile.has_badge ?? false,
        avatar_url: profile.avatar_url ?? null,
        searchIntent: profile.search_intent,
        profileVisibility: profile.profile_visibility,
        portfolioLinks: profile.portfolio_links || [],
    });
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
}

export async function PUT(request: Request) {
    const auth = await validateAuth(undefined, false);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const body = await request.json();
        const seeker_name = (body.full_name || "").trim();

        // Ensure we have a name to satisfy NOT NULL constraint
        if (!seeker_name) {
            // Try to get existing name if available
            const { data: existing } = await supabase
                .from("job_seekers")
                .select("full_name")
                .eq("id", auth.userId)
                .single();

            if (!existing?.full_name) {
                // Last resort fallback
                const { data: userData } = await supabase.from("users").select("email").eq("id", auth.userId).single();
                body.full_name = userData?.email?.split("@")[0] || "";
            } else {
                body.full_name = existing.full_name;
            }
        } else {
            body.full_name = seeker_name;
        }

        let completion = 0;
        if (body.full_name && body.full_name !== "") completion += 20;
        if (body.bio && body.bio.trim() !== "") completion += 15;
        if (body.location && body.location.trim() !== "") completion += 15;
        if (body.phone && body.phone.trim() !== "") completion += 10;
        if (body.skills && body.skills.length > 0) completion += 20;
        if (body.experience && body.experience.length > 0) completion += 10;
        if (body.education && body.education.length > 0) completion += 10;

        // Check if this seeker should auto-receive a badge (first 100 free)
        const { data: currentProfile } = await supabase
            .from("job_seekers")
            .select("has_badge")
            .eq("id", auth.userId)
            .single();

        let has_badge = currentProfile?.has_badge ?? false;

        if (!has_badge) {
            const { count } = await supabase
                .from("job_seekers")
                .select("id", { count: "exact", head: true })
                .eq("has_badge", true);

            if ((count ?? 0) < 100) {
                has_badge = true;
            }
        }

        const { data, error } = await supabase
            .from("job_seekers")
            .upsert({
                id: auth.userId,
                full_name: seeker_name,
                bio: body.bio,
                location: body.location,
                phone: body.phone,
                whatsapp: body.whatsapp || false,
                qualification: body.qualification,
                skills: body.skills || [],
                experience: body.experience || [],
                education: body.education || [],
                salary_expectation: body.salaryExpectation,
                seniority_level: body.seniorityLevel,
                employment_type: body.employmentType,
                search_intent: body.searchIntent || "ACTIVELY_LOOKING",
                profile_visibility: body.profileVisibility || "HIDDEN",
                portfolio_links: body.portfolioLinks || [],
                completion,
                has_badge,
            })
            .select()
            .single();

        if (error) throw error;

        const response = NextResponse.json({ success: true, profile: data });
        response.headers.set("Cache-Control", "no-store, max-age=0");
        return response;
    } catch (error: any) {
        console.error("Profile PUT error:", error);
        return NextResponse.json({ error: error.message || "Failed to update profile" }, { status: 500 });
    }
}
