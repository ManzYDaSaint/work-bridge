import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/resend";
import { canUseEmailForRegistration, isFreeEmailDomain } from "@/lib/email-safety";
import { notifyAdmin } from "@/lib/notifications";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, role, full_name, companyName, industry, location, userId } = body;
        const registrationEmail = String(email || "").trim().toLowerCase();
        const emailValidation = canUseEmailForRegistration(registrationEmail);
        if (!emailValidation.ok) {
            return NextResponse.json({ error: emailValidation.reason || "Invalid email" }, { status: 400 });
        }

        // Use the service-role admin client — no session cookie needed.
        // The browser client's signUp() session cookie may not have propagated
        // to the server yet, so auth.getUser() on the server client would return
        // 401. The admin client looks the user up directly by email.
        const supabase = getSupabaseAdminClient();
        if (!supabase) {
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        if (!userId) {
            return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
        }

        const { data: { user }, error: lookupError } = await supabase.auth.admin.getUserById(userId);
        if (lookupError || !user) {
            return NextResponse.json({ error: "User not found after registration" }, { status: 404 });
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
            const fallbackName = full_name || registrationEmail.split("@")[0] || "";
            const { error: seekerError } = await supabase
                .from("job_seekers")
                .upsert({
                    id: user.id,
                    full_name: fallbackName,
                    location: location || "To be updated"
                });
            if (seekerError) throw seekerError;
        } else if (role === "EMPLOYER") {
            const fallbackCompany = companyName || "New Company";
            const { error: employerError } = await supabase
                .from("employers")
                .upsert({
                    id: user.id,
                    company_name: fallbackCompany,
                    industry: industry || "To be updated",
                    location: location || "To be updated",
                    status: "PENDING",
                    recruiter_verified: !isFreeEmailDomain(registrationEmail),
                });
            if (employerError) throw employerError;
        }

        // 3. Send Welcome Email
        await sendWelcomeEmail(registrationEmail || user.email!, full_name || companyName || "");

        // 4. Notify Administrators (Real-Time System Event)
        if (role === "EMPLOYER") {
            await notifyAdmin({
                title: "New employer verification required",
                message: `${companyName || "A new company"} has requested access to the platform.`,
                type: "VERIFICATION_UPDATE",
                link: `/dashboard/admin/employers`
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Registration API error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
