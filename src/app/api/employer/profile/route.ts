import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
    const auth = await validateAuth(['EMPLOYER']);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();
    const { data: profile, error } = await supabase
        .from("employers")
        .select("*")
        .eq("id", auth.userId)
        .single();

    if (error && error.code !== "PGRST116") {
        console.error("Employer Profile GET error:", error);
        return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }

    if (!profile) {
        return NextResponse.json({
            companyName: "",
            industry: "",
            location: "",
            website: "",
            description: "",
            applicationAlerts: true,
            hiringVelocity: true,
            candidatePrivacy: false
        });
    }

    return NextResponse.json({
        id: profile.id,
        companyName: profile.company_name,
        industry: profile.industry,
        location: profile.location,
        website: profile.website,
        description: profile.description,
        status: profile.status,
        applicationAlerts: profile.application_alerts ?? true,
        hiringVelocity: profile.hiring_velocity ?? true,
        candidatePrivacy: profile.candidate_privacy ?? false
    });
}

export async function PUT(request: Request) {
    const auth = await validateAuth(['EMPLOYER'], true);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const body = await request.json();

        // Ensure defined boolean values are explicitly true/false, default back to their schema defaults otherwise
        const application_alerts = body.applicationAlerts !== undefined ? body.applicationAlerts : true;
        const hiring_velocity = body.hiringVelocity !== undefined ? body.hiringVelocity : true;
        const candidate_privacy = body.candidatePrivacy !== undefined ? body.candidatePrivacy : false;

        const { data, error } = await supabase
            .from("employers")
            .upsert({
                id: auth.userId,
                company_name: body.companyName,
                industry: body.industry,
                location: body.location,
                website: body.website,
                description: body.description,
                application_alerts,
                hiring_velocity,
                candidate_privacy
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, profile: data });
    } catch (error: any) {
        console.error("Employer Profile PUT error:", error);
        return NextResponse.json({ error: error.message || "Failed to update profile" }, { status: 500 });
    }
}
