import { NextResponse } from "next/server";
import { canUseEmailForRegistration, isFreeEmailDomain } from "@/lib/email-safety";
import { NotificationService } from "@/services/notification.service";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { verifyTurnstileToken } from "@/lib/turnstile";

const PUBLIC_REGISTRATION_ROLES = new Set(["JOB_SEEKER", "EMPLOYER"]);

function getPublicRole(value: unknown): "JOB_SEEKER" | "EMPLOYER" | null {
    return typeof value === "string" && PUBLIC_REGISTRATION_ROLES.has(value)
        ? value as "JOB_SEEKER" | "EMPLOYER"
        : null;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, role, full_name, companyName, industry, location, turnstileToken } = body;
        const registrationEmail = String(email || "").trim().toLowerCase();
        const requestedRole = getPublicRole(role);
        if (!requestedRole) {
            return NextResponse.json({ error: "Invalid registration role" }, { status: 400 });
        }

        // Verify Turnstile Token
        try {
            await verifyTurnstileToken(turnstileToken);
        } catch (error: any) {
            console.warn("[register] turnstile verification failed:", error.message);
            return NextResponse.json({ error: "Security verification failed. Please try again." }, { status: 403 });
        }

        const emailValidation = canUseEmailForRegistration(registrationEmail);
        if (!emailValidation.ok) {
            return NextResponse.json({ error: emailValidation.reason || "Invalid email" }, { status: 400 });
        }

        const serverSupabase = await createSupabaseServerClient();
        const { data: { user: sessionUser } } = await serverSupabase.auth.getUser();

        const supabase = getSupabaseAdminClient();
        if (!supabase) {
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        let authUser = sessionUser;
        if (authUser && authUser.email) {
            const sessionEmail = String(authUser.email || "").trim().toLowerCase();
            if (sessionEmail !== registrationEmail) {
                console.warn("[register] rejected mismatched session/email pair.");
                return NextResponse.json({ error: "Registration identity mismatch" }, { status: 403 });
            }
        }

        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized registration request" }, { status: 401 });
        }

        // identities is empty when the signup is awaiting email confirmation
        const isPendingConfirmation = Array.isArray(authUser.identities) && authUser.identities.length === 0;
        if (isPendingConfirmation) {
            console.warn("[register] user signup pending email confirmation, skipping profile upsert.");
            return NextResponse.json({ success: true, pending: true });
        }

        const authEmail = String(authUser.email || "").trim().toLowerCase();
        if (!authEmail || authEmail !== registrationEmail) {
            console.warn("[register] rejected mismatched user/email pair.");
            return NextResponse.json({ error: "Registration identity mismatch" }, { status: 403 });
        }

        const finalRole = requestedRole;

        const { data: existingUser, error: existingUserError } = await supabase
            .from("users")
            .select("id, role")
            .eq("id", authUser.id)
            .maybeSingle();

        if (existingUserError) throw existingUserError;

        if (existingUser?.role === "ADMIN") {
            return NextResponse.json({ success: true });
        }

        // 1. Create Public User Record
        if (!existingUser) {
            const { error: userError } = await supabase
                .from("users")
                .insert({
                id: authUser.id,
                email: authEmail,
                role: finalRole
            });

            if (userError) throw userError;
        }

        // 2. Create Role-Specific Profile
        const effectiveRole = (existingUser?.role || finalRole) as "JOB_SEEKER" | "EMPLOYER";
        if (effectiveRole === "JOB_SEEKER") {
            const fallbackName = full_name || registrationEmail.split("@")[0] || "";
            const { error: seekerError } = await supabase
                .from("job_seekers")
                .insert({
                    id: authUser.id,
                    full_name: fallbackName,
                    location: location || "To be updated"
                })
                .select("id")
                .single();
            if (seekerError?.code === "23505") {
                // Profile already exists from the auth trigger; avoid public rewrites.
            } else if (seekerError) throw seekerError;
        } else if (effectiveRole === "EMPLOYER") {
            const { data: existingEmployer } = await supabase
                .from("employers")
                .select("id")
                .eq("id", authUser.id)
                .maybeSingle();

            if (!existingEmployer) {
                const fallbackCompany = companyName || "New Company";
                const { error: employerError } = await supabase
                    .from("employers")
                    .insert({
                        id: authUser.id,
                        company_name: fallbackCompany,
                        industry: industry || "To be updated",
                        location: location || "To be updated",
                        status: "PENDING",
                        recruiter_verified: !isFreeEmailDomain(registrationEmail),
                    });
                if (employerError) throw employerError;
            }
        }


        // 4. Notify Administrators (Real-Time System Event)
        if (effectiveRole === "EMPLOYER") {
            await NotificationService.notifyAdmin({
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
