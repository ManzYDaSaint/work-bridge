import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

/**
 * GET /api/jobs/[id]/candidates/[candidateId]/qualifications
 * Employers can view the qualifications (certificates) of a specific candidate
 * recommended for their job. Ownership of the job is verified before responding.
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string; candidateId: string }> }
) {
    const { id: jobId, candidateId } = await params;
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify the employer owns this job
    const { data: job, error: jobErr } = await supabase
        .from("jobs")
        .select("id")
        .eq("id", jobId)
        .eq("employer_id", user.id)
        .single();

    if (jobErr || !job) {
        return NextResponse.json({ error: "Job not found or access denied" }, { status: 403 });
    }

    // Fetch candidate's certificates (name is NOT exposed — anonymity preserved)
    const { data: certs, error: certsErr } = await supabase
        .from("certificates")
        .select("id, url, file_name, parsed_qualification, parsed_cert_name, is_name_verified, created_at")
        .eq("seeker_id", candidateId)
        .order("created_at", { ascending: true });

    if (certsErr) return NextResponse.json({ error: certsErr.message }, { status: 500 });

    const mapped = (certs || []).map(c => ({
        id: c.id,
        url: c.url,
        fileName: c.file_name,
        parsedQualification: c.parsed_qualification,
        // Redact the actual name on the cert for anonymity; employer only sees qualification type
        isNameVerified: c.is_name_verified,
        createdAt: c.created_at,
    }));

    return NextResponse.json(mapped);
}
