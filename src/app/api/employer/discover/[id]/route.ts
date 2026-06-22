import { validateAuth } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await validateAuth(['EMPLOYER', 'ADMIN'], false, true);
    if (auth.error) return auth.error;

    const { id } = await params;
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Fetch the seeker profile
    const { data: seeker, error } = await supabase
        .from("job_seekers")
        .select(`*, users (email)`)
        .eq("id", id)
        .single();

    if (error || !seeker) {
        return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    if (seeker.profile_visibility === "HIDDEN") {
        return NextResponse.json({ error: "Candidate profile is not visible" }, { status: 404 });
    }

    // Increment seeker's profile_views counter in the background
    supabase
        .from("job_seekers")
        .update({ profile_views: (seeker.profile_views || 0) + 1 })
        .eq("id", seeker.id)
        .then();

    // Fetch their certificates
    const { data: certificates } = await supabase
        .from("certificates")
        .select("*")
        .eq("seeker_id", id)
        .order("issue_date", { ascending: false });

    // --- Contact View Limit: 30 unique candidates/month ---
    const isAnonymous = seeker.profile_visibility === "ANONYMOUS";
    let canSeeContact = false;
    let contactLimitReached = false;

    if (!isAnonymous && auth.role === "EMPLOYER") {
        const startOfMonth = new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            1
        ).toISOString();

        const { data: employerData } = await supabase
            .from("employers")
            .select("contact_limit_bonus")
            .eq("id", auth.userId)
            .single();

        const bonus = employerData?.contact_limit_bonus || 0;

        const { data: contactDecision, error: contactError } = await supabase.rpc(
            "try_record_employer_contact_view",
            {
                p_employer_id: auth.userId,
                p_seeker_id: seeker.id,
                p_month_limit: 30 + bonus
            }
        );

        if (contactError) {
            console.error("Contact view RPC failed:", contactError);
            return NextResponse.json({ error: "Failed to determine contact visibility" }, { status: 500 });
        }

        const allowed = Array.isArray(contactDecision) ? contactDecision[0]?.can_see : contactDecision?.can_see;
        const viewCount = Array.isArray(contactDecision) ? contactDecision[0]?.view_count : contactDecision?.view_count;

        if (allowed) {
            canSeeContact = true;
        } else {
            contactLimitReached = true;
        }
    }

    // ADMIN always sees contact
    if (auth.role === "ADMIN") canSeeContact = true;

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
        employment_status: seeker.employment_status ?? null,
        search_intent: seeker.search_intent,
        qualification: seeker.qualification,
        // Contact gating — driven by monthly view limit, not plan
        isContactGated: !canSeeContact,
        contactLimitReached,   // true = limit hit (vs. anonymous = different message)
        contact: canSeeContact
            ? {
                  email: seeker.users?.email,
                  phone: seeker.phone,
                  whatsapp: seeker.whatsapp,
              }
            : null,
    };

    return NextResponse.json(publicProfile);
}
