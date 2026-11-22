import { NextResponse } from "next/server";
import { canUseEmailForRegistration, isFreeEmailDomain } from "@/lib/email-safety";
import { NotificationService } from "@/services/notification.service";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { emitSystemEvent } from "@/lib/mission-control";
import { isFreshUserRecord } from "@/lib/role-utils";

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
        const prefersRequestedRole = !!(finalRole && (!existingUser || existingUser.role === finalRole || isFreshUserRecord(authUser.created_at)));
        const effectiveRole = (prefersRequestedRole ? finalRole : (existingUser?.role || finalRole)) as "JOB_SEEKER" | "EMPLOYER";
        if (effectiveRole === "JOB_SEEKER") {
            const fallbackName = (full_name || (registrationEmail.includes("@") ? registrationEmail.split("@")[0] : "") || "Job Seeker").trim() || "Job Seeker";
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
            const claimToken = typeof body.claimToken === "string" ? body.claimToken.trim() : null;
            let claimedEmployerId: string | null = null;

            if (claimToken) {
                const crypto = await import("crypto");
                const tokenHash = crypto.createHash("sha256").update(claimToken).digest("hex");
                const now = new Date().toISOString();

                // Look up matching LEAD employer with valid token
                const { data: leadEmployer } = await supabase
                    .from("employers")
                    .select("id, company_name, account_type, user_id, claim_token_expires_at")
                    .eq("claim_token_hash", tokenHash)
                    .maybeSingle();

                if (leadEmployer && (!leadEmployer.claim_token_expires_at || leadEmployer.claim_token_expires_at > now)) {
                    claimedEmployerId = leadEmployer.id;

                    // Link this user account to the existing employer lead
                    const { error: claimUpdateError } = await supabase
                        .from("employers")
                        .update({
                            user_id: authUser.id,
                            account_type: "REGISTERED",
                            status: "PENDING",
                            claimed_at: now,
                            claimed_by_user_id: authUser.id,
                            claim_token_hash: null, // single-use: invalidate token
                        })
                        .eq("id", leadEmployer.id);

                    if (claimUpdateError) {
                        console.error("[register] Failed to link claimed employer lead:", claimUpdateError);
                    } else {
                        // Update CRM status to REGISTERED
                        const { CRMService } = await import("@/lib/crm/crm-service");
                        await CRMService.updateStatus(leadEmployer.id, "REGISTERED");
                        await CRMService.updateScore(leadEmployer.id, 20);
                    }
                }
            }

            // If no claimToken was passed, check for automatic corporate domain or exact company name match
            if (!claimedEmployerId) {
                const now = new Date().toISOString();
                const domain = registrationEmail.includes("@") ? registrationEmail.split("@")[1]?.toLowerCase() : "";
                const isCorporate = domain && !isFreeEmailDomain(registrationEmail);

                let matchedLead: { id: string; company_name: string } | null = null;

                // 1. Try matching corporate domain against LEAD employer recruitment_email or website
                if (isCorporate) {
                    const { data: domainLead } = await supabase
                        .from("employers")
                        .select("id, company_name")
                        .eq("account_type", "LEAD")
                        .is("user_id", null)
                        .or(`recruitment_email.ilike.%@${domain},website.ilike.%${domain}%`)
                        .limit(1)
                        .maybeSingle();

                    if (domainLead) {
                        matchedLead = domainLead;
                    }
                }

                // 2. Try matching exact company name if specified
                if (!matchedLead && companyName?.trim()) {
                    const { data: nameLead } = await supabase
                        .from("employers")
                        .select("id, company_name")
                        .eq("account_type", "LEAD")
                        .is("user_id", null)
                        .ilike("company_name", companyName.trim())
                        .limit(1)
                        .maybeSingle();

                    if (nameLead) {
                        matchedLead = nameLead;
                    }
                }

                if (matchedLead) {
                    claimedEmployerId = matchedLead.id;
                    await supabase
                        .from("employers")
                        .update({
                            user_id: authUser.id,
                            account_type: "REGISTERED",
                            status: "PENDING",
                            claimed_at: now,
                            claimed_by_user_id: authUser.id,
                            claim_token_hash: null,
                        })
                        .eq("id", matchedLead.id);

                    const { CRMService } = await import("@/lib/crm/crm-service");
                    await CRMService.updateStatus(matchedLead.id, "REGISTERED");
                    await CRMService.updateScore(matchedLead.id, 25);
                }
            }

            // Only insert new employer row if not linked to an existing lead
            if (!claimedEmployerId) {
                const { data: existingEmployer } = await supabase
                    .from("employers")
                    .select("id")
                    .or(`id.eq.${authUser.id},user_id.eq.${authUser.id}`)
                    .maybeSingle();

                if (!existingEmployer) {
                    const fallbackCompany = companyName || "New Company";
                    const { error: employerError } = await supabase
                        .from("employers")
                        .insert({
                            id: authUser.id,
                            user_id: authUser.id,
                            company_name: fallbackCompany,
                            industry: industry || "To be updated",
                            location: location || "To be updated",
                            status: "PENDING",
                            account_type: "REGISTERED",
                            recruiter_verified: !isFreeEmailDomain(registrationEmail),
                        });
                    if (employerError) throw employerError;
                }
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
        
        await emitSystemEvent({
            category: effectiveRole === "EMPLOYER" ? "EMPLOYER" : "USER",
            severity: "SUCCESS",
            event: "USER_REGISTERED",
            message: `New ${effectiveRole} registered: ${authEmail}`,
            actorId: authUser.id,
            metadata: { role: effectiveRole, email: authEmail, industry, location }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Registration API error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}


export const dynamic = "force-dynamic";
