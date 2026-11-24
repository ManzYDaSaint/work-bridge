import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import crypto from "crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
        return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
        return NextResponse.json({ error: "Database client unavailable" }, { status: 500 });
    }

    try {
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const now = new Date().toISOString();

        const { data: employer, error } = await supabase
            .from("employers")
            .select("id, company_name, recruitment_email, industry, location, website, account_type, user_id, claim_token_expires_at")
            .eq("claim_token_hash", tokenHash)
            .maybeSingle();

        if (error || !employer) {
            return NextResponse.json({ error: "Invalid or expired invitation token." }, { status: 404 });
        }

        if (employer.user_id || (employer.account_type && employer.account_type !== "LEAD")) {
            return NextResponse.json({ error: "This company profile has already been claimed." }, { status: 400 });
        }

        if (employer.claim_token_expires_at && employer.claim_token_expires_at < now) {
            return NextResponse.json({ error: "This invitation link has expired. Please contact support." }, { status: 400 });
        }

        return NextResponse.json({
            valid: true,
            employerId: employer.id,
            companyName: employer.company_name,
            email: employer.recruitment_email,
            industry: employer.industry,
            location: employer.location,
            website: employer.website,
        });
    } catch (err: any) {
        console.error("[Verify Claim Token] Error:", err);
        return NextResponse.json({ error: err.message || "Failed to verify token" }, { status: 500 });
    }
}
