import { createSupabaseServerClient } from "@/lib/supabase-server";
import { withAuth } from "@/lib/auth-guard";
import { NextResponse } from "next/server";

/**
 * GET /api/jobs/[id]/candidates/[candidateId]/qualifications
 * Employers can view the qualifications (certificates) of a specific candidate
 * recommended for their job. Ownership of the job is verified before responding.
 */
export const GET = withAuth(async (_request, auth, { params }) => {
    const { id: jobId, candidateId } = await params;
    const supabase = await createSupabaseServerClient();
    const userId = auth.userId;

    const { data: job, error: jobErr } = await supabase
        .from("jobs")
        .select("id")
        .eq("id", jobId)
        .eq("employer_id", userId)
        .single();

    if (jobErr || !job) {
        return NextResponse.json({ error: "Job not found or access denied" }, { status: 403 });
    }

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
        isNameVerified: c.is_name_verified,
        createdAt: c.created_at,
    }));

    return NextResponse.json(mapped);
}, ["EMPLOYER"], false, true);
