import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string; candidateId: string }> }
) {
    const resolvedParams = await params;
    const { id: jobId, candidateId } = resolvedParams;
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: "GEMINI_API_KEY environment variable is not configured." }, { status: 500 });
    }

    try {
        // 1. Verify the employer owns this job and get Job details
        const { data: job, error: jobErr } = await supabase
            .from("jobs")
            .select("title, description, skills")
            .eq("id", jobId)
            .eq("employer_id", user.id)
            .single();

        if (jobErr || !job) {
            return NextResponse.json({ error: "Job not found or access denied" }, { status: 403 });
        }

        // 2. Fetch the candidate's profile data
        const { data: candidate, error: candidateErr } = await supabase
            .from("job_seekers")
            .select("full_name, bio, skills, experience")
            .eq("id", candidateId)
            .single();

        if (candidateErr || !candidate) {
            return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
        }

        // 3. Fetch candidate's certificates (extract qualification text)
        const { data: certs } = await supabase
            .from("certificates")
            .select("parsed_qualification, is_name_verified")
            .eq("seeker_id", candidateId);

        // 4. Build prompt text
        const candidateExperienceStr = Array.isArray(candidate.experience)
            ? candidate.experience.map(e => `- **${e.role}** at ${e.company} (${e.startDate} - ${e.endDate || 'Present'}): ${e.description}`).join("\n")
            : "No formal experience listed.";

        const candidateCertsStr = (certs || []).length > 0
            ? certs!.map(c => `- ${c.parsed_qualification || 'Unknown Document'} ${c.is_name_verified ? '(Name Verified)' : ''}`).join("\n")
            : "No verifiable academic certificates on record.";

        const prompt = `You are an expert ATS Resume Writer and Executive Corporate Recruiter. 
I am going to provide you with the raw data of a Candidate and the requirements of a specific Job Vacancy.
Your task is to synthesize this raw data into a cohesive, highly professional Resume tailored to this exact job.

CRITICALLY IMPORTANT: The candidate's real name is "${candidate.full_name}". DO NOT USE THEIR REAL NAME. To preserve zero-bias anonymity in our discovery system, you MUST refer to them strictly as "Candidate #101" at the top of the resume.

JOB VACANCY DETAILS:
Title: ${job.title}
Required Skills: ${(job.skills || []).join(', ')}
Description: ${job.description}

CANDIDATE RAW DATA:
Bio: ${candidate.bio || "None"}
Skills: ${(candidate.skills || []).join(', ')}
Certificates/Degrees:
${candidateCertsStr}
Experience:
${candidateExperienceStr}

INSTRUCTIONS:
1. Write a beautiful, ATS-optimized markdown resume.
2. Start with a compelling Professional Summary that immediately connects the candidate's background to the ${job.title} role.
3. Highlight exact skill alignments between the candidate's experience and the job's needs.
4. Ensure a premium, confident tone suitable for an elite matching platform.
5. DO NOT invent fake companies, fake degrees, or imaginary experiences. Stick to the facts provided, just articulate them remarkably well.
6. The entire output must be valid Markdown. Avoid wraping the response in \`\`\`markdown tags, just return the raw markdown string.`;

        // 5. Call Gemini
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.3,
            }
        });

        const markdownResume = response.text || "Failed to generate resume.";

        // Strip markdown codeblocks if Gemini added them despite instructions
        const cleanMarkdown = markdownResume.replace(/^```markdown\n/, '').replace(/\n```$/, '');

        return NextResponse.json({ markdown: cleanMarkdown });

    } catch (error: any) {
        console.error("AI Resume Generation Error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate AI resume" }, { status: 500 });
    }
}
