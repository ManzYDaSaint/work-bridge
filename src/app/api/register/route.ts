import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/resend";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, role, fullName, companyName, industry, location } = body;

        const supabase = await createSupabaseServerClient();

        // Get the authenticated user from the session (signUp just happened)
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Create Public User Record
        const { error: userError } = await supabase
            .from("users")
            .upsert({
                id: user.id,
                email: email || user.email,
                role: role
            });

        if (userError) throw userError;

        // 2. Create Role-Specific Profile
        if (role === "JOB_SEEKER") {
            const { error: seekerError } = await supabase
                .from("job_seekers")
                .upsert({
                    id: user.id,
                    full_name: fullName,
                    location: location
                });
            if (seekerError) throw seekerError;
        } else if (role === "EMPLOYER") {
            const { error: employerError } = await supabase
                .from("employers")
                .upsert({
                    id: user.id,
                    company_name: companyName,
                    industry: industry,
                    location: location,
                    status: "PENDING"
                });
            if (employerError) throw employerError;
        }

        // 3. Send Welcome Email
        await sendWelcomeEmail(email || user.email!, fullName || companyName || "New User");

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Registration API error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
