import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { getSemanticMatchScore, generateAnonymizedSummary } from "@/lib/ai";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const resolvedParams = await params;
    const jobId = resolvedParams.id;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch job
    const { data: job, error: jobError } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .single();

    if (jobError || !job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Fetch all SUBSCRIBED seekers
    const { data: seekers, error: seekerError } = await supabase
        .from("job_seekers")
        .select("*")
        .eq("is_subscribed", true);

    if (seekerError) return NextResponse.json({ error: "Failed to fetch candidates" }, { status: 500 });

    // Fetch all certificates for these seekers in one query
    const seekerIds = (seekers || []).map(s => s.id);
    const { data: allCerts } = seekerIds.length > 0
        ? await supabase.from("certificates").select("*").in("seeker_id", seekerIds)
        : { data: [] };

    // Group certs by seeker_id for fast lookup
    const certsBySeeker: Record<string, any[]> = {};
    for (const cert of allCerts || []) {
        if (!certsBySeeker[cert.seeker_id]) certsBySeeker[cert.seeker_id] = [];
        certsBySeeker[cert.seeker_id].push(cert);
    }

    // Score & anonymize
    const matches = await Promise.all((seekers || []).map(async (seeker, index) => {
        const seekerCerts = certsBySeeker[seeker.id] || [];
        const certInputs = seekerCerts.map(c => ({
            parsedQualification: c.parsed_qualification,
            isNameVerified: c.is_name_verified,
        }));

        const result = await getSemanticMatchScore(
            seeker.skills || [],
            job.skills || [],
            seeker.bio || "",
            job.description || "",
            certInputs
        );

        const matchedSkills = (seeker.skills || []).filter(
            (s: string) => (job.skills || []).map((js: string) => js.toLowerCase()).includes(s.toLowerCase())
        );
        const missingSkills = (job.skills || []).filter(
            (js: string) => !(seeker.skills || []).map((s: string) => s.toLowerCase()).includes(js.toLowerCase())
        );

        return {
            id: seeker.id,
            anonymizedName: `Candidate #${index + 101}`,
            bio: generateAnonymizedSummary(seeker.bio || ""),
            location: seeker.location,
            skills: seeker.skills || [],
            matchScore: result.score,
            matchJustification: result.justification,
            matchedSkills,
            missingSkills,
            certCount: seekerCerts.length,
            verifiedCertCount: seekerCerts.filter(c => c.is_name_verified).length,
        };
    }));

    return NextResponse.json(
        matches.filter(m => m.matchScore > 20).sort((a, b) => b.matchScore - a.matchScore)
    );
}
