import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function GET() {
    const auth = await validateAuth(['EMPLOYER']);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();
    const { data: profile, error } = await supabase
        .from("employers")
        .select("*")
        .or(`user_id.eq.${auth.userId},id.eq.${auth.userId}`)
        .maybeSingle();

    if (error) {
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
            logoUrl: "",
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
        logoUrl: profile.logo_url,
        recruiterVerified: profile.recruiter_verified ?? false,
    });
}

export async function PUT(request: Request) {
    const auth = await validateAuth(['EMPLOYER'], false);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const body = await request.json();

        // Check if an existing employer record exists by user_id or id
        const { data: existingEmployer } = await supabase
            .from("employers")
            .select("id")
            .or(`user_id.eq.${auth.userId},id.eq.${auth.userId}`)
            .maybeSingle();

        let data;
        if (existingEmployer) {
            const { data: updated, error: updateError } = await supabase
                .from("employers")
                .update({
                    company_name: body.companyName,
                    industry: body.industry,
                    location: body.location,
                    website: body.website,
                    description: body.description,
                    logo_url: body.logoUrl,
                    user_id: auth.userId,
                })
                .eq("id", existingEmployer.id)
                .select()
                .single();

            if (updateError) throw updateError;
            data = updated;
        } else {
            const { data: inserted, error: insertError } = await supabase
                .from("employers")
                .insert({
                    id: auth.userId,
                    user_id: auth.userId,
                    company_name: body.companyName,
                    industry: body.industry,
                    location: body.location,
                    website: body.website,
                    description: body.description,
                    logo_url: body.logoUrl,
                })
                .select()
                .single();

            if (insertError) throw insertError;
            data = inserted;
        }
        
        // Refresh the dashboard and public views
        revalidatePath("/", "layout");
        revalidatePath("/dashboard/employer");
        revalidatePath("/jobs");

        return NextResponse.json({ success: true, profile: data });
    } catch (error: any) {
        console.error("Employer Profile PUT error:", error);
        return NextResponse.json({ error: error.message || "Failed to update profile" }, { status: 500 });
    }
}


export const dynamic = "force-dynamic";
