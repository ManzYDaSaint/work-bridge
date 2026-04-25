import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const auth = await validateAuth();
    if (auth.error) return auth.error;
    if (auth.role !== "EMPLOYER" && auth.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();
    
    // First fetch the seeker
    const { data: seeker, error } = await supabase
        .from("job_seekers")
        .select(`
            *,
            users (email)
        `)
        .eq("id", params.id)
        .single();

    if (error || !seeker) {
        return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    if (seeker.profile_visibility === "HIDDEN") {
        return NextResponse.json({ error: "Candidate profile is not visible" }, { status: 404 });
    }

    // Increment profile views in the background (no await needed for the response)
    supabase
        .from("job_seekers")
        .update({ profile_views: (seeker.profile_views || 0) + 1 })
        .eq("id", seeker.id)
        .then();

    // Fetch their certificates
    const { data: certificates } = await supabase
        .from("certificates")
        .select("*")
        .eq("seeker_id", params.id)
        .order("issue_date", { ascending: false });

    // Check Employer Plan
    let isPremium = false;
    if (auth.role === "EMPLOYER") {
        const { data: empData } = await supabase.from("employers").select("plan").eq("id", auth.userId).single();
        isPremium = empData?.plan === "PREMIUM";
    }

    // Handle anonymity and gating
    const isAnonymous = seeker.profile_visibility === "ANONYMOUS";
    const canSeeContact = isPremium && !isAnonymous;

    const publicProfile = {
        id: seeker.id,
        full_name: isAnonymous ? "Anonymous Candidate" : seeker.full_name,
        bio: seeker.bio,
        location: isAnonymous ? null : seeker.location,
        avatar_url: isAnonymous ? null : seeker.avatar_url,
        skills: seeker.skills || [],
        experience: seeker.experience || [],
        education: seeker.education || [],
        certificates: certificates || [],
        portfolio_links: seeker.portfolio_links || [],
        seniority_level: seeker.seniority_level,
        employment_type: seeker.employment_type,
        search_intent: seeker.search_intent,
        qualification: seeker.qualification,
        isContactGated: !canSeeContact, // Flag for the frontend
        contact: canSeeContact ? {
            email: seeker.users?.email,
            phone: seeker.phone,
            whatsapp: seeker.whatsapp
        } : null
    };

    return NextResponse.json(publicProfile);
}
