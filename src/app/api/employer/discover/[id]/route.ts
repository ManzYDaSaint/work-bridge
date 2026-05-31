import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await validateAuth();
    if (auth.error) return auth.error;
    if (auth.role !== "EMPLOYER" && auth.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const supabase = await createSupabaseServerClient();

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

        // Count how many unique candidates this employer has revealed contact for this month
        const { count: monthlyViewCount } = await supabase
            .from("employer_contact_views")
            .select("id", { count: "exact", head: true })
            .eq("employer_id", auth.userId)
            .gte("viewed_at", startOfMonth);

        const underLimit = (monthlyViewCount || 0) < 30;

        if (underLimit) {
            canSeeContact = true;

            // Record this view if not already recorded this month (dedup)
            const { data: alreadyViewed } = await supabase
                .from("employer_contact_views")
                .select("id")
                .eq("employer_id", auth.userId)
                .eq("seeker_id", seeker.id)
                .gte("viewed_at", startOfMonth)
                .maybeSingle();

            if (!alreadyViewed) {
                // Non-blocking background insert — counts toward monthly limit
                supabase
                    .from("employer_contact_views")
                    .insert({ employer_id: auth.userId, seeker_id: seeker.id })
                    .then();
            }
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
