import { validateAuth } from "@/lib/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { CRMService } from "@/lib/crm/crm-service";
import { emitSystemEvent } from "@/lib/mission-control";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    const auth = await validateAuth(["ADMIN"], false);
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
        return NextResponse.json({ error: "Database client unavailable" }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { companyName, industry, location, website, recruitmentEmail, recruitmentUrl, description } = body;

        const trimmedName = String(companyName || "").trim();
        if (!trimmedName) {
            return NextResponse.json({ error: "Company name is required." }, { status: 400 });
        }

        // Check if an employer with exact name already exists
        const { data: existing } = await supabase
            .from("employers")
            .select("id, company_name, account_type, recruitment_email, recruitment_url")
            .ilike("company_name", trimmedName)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({
                employer: existing,
                message: "Employer already exists",
                alreadyExisted: true,
            });
        }

        const now = new Date().toISOString();
        const newEmployerId = crypto.randomUUID();

        // 1. Insert into employers table as a LEAD (no user account yet)
        const { data: newEmployer, error: insertError } = await supabase
            .from("employers")
            .insert({
                id: newEmployerId,
                company_name: trimmedName,
                industry: industry?.trim() || "To be updated",
                location: location?.trim() || "To be updated",
                website: website?.trim() || null,
                recruitment_email: recruitmentEmail?.trim()?.toLowerCase() || null,
                recruitment_url: recruitmentUrl?.trim() || null,
                description: description?.trim() || null,
                account_type: "LEAD",
                status: "PENDING",
                recruiter_verified: false,
                sourced_at: now,
                created_at: now,
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // 2. Initialize in employer_crm_profiles table as LEAD
        await CRMService.createLeadProfile(newEmployer.id, 10);

        // 3. Emit Mission Control Audit Event
        await emitSystemEvent({
            category: "EMPLOYER",
            severity: "INFO",
            event: "SOURCED_EMPLOYER_LEAD_CREATED",
            message: `Sourced employer lead created for "${trimmedName}"`,
            actorId: auth.user.id,
            metadata: {
                employerId: newEmployer.id,
                companyName: trimmedName,
                recruitmentEmail: newEmployer.recruitment_email,
            },
        });

        return NextResponse.json({
            employer: newEmployer,
            message: "Employer lead created successfully.",
            alreadyExisted: false,
        });
    } catch (err: any) {
        console.error("[Admin Create Employer Lead] Error:", err);
        return NextResponse.json({ error: err.message || "Failed to create employer lead" }, { status: 500 });
    }
}
