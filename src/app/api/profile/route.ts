import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { generateAIAnonymizedSummary } from "@/lib/ai";
import { NextResponse } from "next/server";

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
        return NextResponse.json({
            fullName: "",
            bio: "",
            location: "",
            skills: [],
            completion: 0,
            emailAlias: "",
            privacyLevel: "VERIFIED_ONLY",
            newJobAlerts: true,
            appStatusPulse: true,
            marketingInsights: false
        });
    }

    return NextResponse.json({
        id: profile.id,
        fullName: profile.full_name,
        bio: profile.bio,
        location: profile.location,
        skills: profile.skills,
        salaryExpectation: profile.salary_expectation,
        seniorityLevel: profile.seniority_level,
        employmentType: profile.employment_type,
        experience: profile.experience || [],
        completion: profile.completion,
        isSubscribed: profile.is_subscribed,
        emailAlias: profile.email_alias,
        privacyLevel: profile.privacy_level ?? 'VERIFIED_ONLY',
        newJobAlerts: profile.new_job_alerts ?? true,
        appStatusPulse: profile.app_status_pulse ?? true,
        marketingInsights: profile.marketing_insights ?? false
    });
}

export async function PUT(request: Request) {
    const auth = await validateAuth(undefined, true);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const body = await request.json();

        let completion = 0;
        if (body.fullName && body.fullName.trim() !== "") completion += 20;
        if (body.bio && body.bio.trim() !== "") completion += 30;
        if (body.location && body.location.trim() !== "") completion += 20;
        if (body.skills && body.skills.length > 0) completion += 20;
        if (body.experience && body.experience.length > 0) completion += 10;

        // Generate Anonymized Summary using AI
        const anonymizedSummary = await generateAIAnonymizedSummary(body.bio || "", body.skills || []);

        const new_job_alerts = body.newJobAlerts !== undefined ? body.newJobAlerts : true;
        const app_status_pulse = body.appStatusPulse !== undefined ? body.appStatusPulse : true;
        const marketing_insights = body.marketingInsights !== undefined ? body.marketingInsights : false;

        const { data, error } = await supabase
            .from("job_seekers")
            .upsert({
                id: auth.userId,
                full_name: body.fullName,
                bio: body.bio,
                location: body.location,
                skills: body.skills || [],
                experience: body.experience || [],
                salary_expectation: body.salaryExpectation,
                seniority_level: body.seniorityLevel,
                employment_type: body.employmentType,
                anonymized_summary: anonymizedSummary,
                completion,
                email_alias: body.emailAlias,
                privacy_level: body.privacyLevel,
                new_job_alerts,
                app_status_pulse,
                marketing_insights
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, profile: data });
    } catch (error: any) {
        console.error("Profile PUT error:", error);
        return NextResponse.json({ error: error.message || "Failed to update profile" }, { status: 500 });
    }
}
