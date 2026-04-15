import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const { employerId } = await request.json();

        // 1. Fetch employer details
        const { data: employer, error } = await supabase
            .from("employers")
            .select("*")
            .eq("id", employerId)
            .single();

        if (error || !employer) {
            return NextResponse.json({ error: "Employer not found" }, { status: 404 });
        }

        const auditResult = {
            riskLevel: employer.website && employer.description ? "LOW" : "MEDIUM",
            flags: [
                !employer.website ? "Missing website" : null,
                !employer.description ? "Missing company description" : null,
                employer.status !== "APPROVED" ? "Employer not yet approved" : null,
            ].filter(Boolean),
            recommendation: employer.website && employer.description
                ? "Proceed with manual review."
                : "Request more company information before approval.",
        };

        // 3. (Optional) Store audit result in metadata or a separate column
        // For now, we return it to the admin dashboard for immediate review.

        return NextResponse.json({
            success: true,
            audit: auditResult
        });
    } catch (error: any) {
        console.error("Employer Audit API error:", error);
        return NextResponse.json({ error: "Audit failed", details: error.message }, { status: 500 });
    }
}
