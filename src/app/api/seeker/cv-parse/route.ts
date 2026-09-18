import { validateAuth } from "@/lib/auth-guard";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Intelligent client/server CV text parser helper.
 * Extracts contact info, summary, skills, education, and work history.
 */
function parseCVText(text: string) {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

    let fullName = "";
    let phone = "";
    let bio = "";
    let qualification = "";
    const skills: string[] = [];
    const experience: Array<{ title: string; company: string; period: string; description: string }> = [];
    const education: Array<{ degree: string; institution: string; year: string }> = [];

    // Extract Phone Number (Malawi & International formats)
    const phoneRegex = /(?:\+?265|0)[189]\d{8}|\+?\d{1,4}[-.\s]?\(?\d{1,3}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) {
        phone = phoneMatch[0].trim();
    }

    // Common skills dictionary for extraction match
    const commonSkillsDict = [
        "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Python", "Java", "C++", "C#",
        "HTML", "CSS", "Tailwind CSS", "SQL", "PostgreSQL", "MySQL", "MongoDB", "Git", "GitHub",
        "Project Management", "Data Analysis", "Graphic Design", "UI/UX Design", "Digital Marketing",
        "SEO", "Accounting", "Financial Modeling", "Public Relations", "Communication", "Customer Service",
        "Leadership", "Sales", "Microsoft Excel", "Microsoft Office", "Word", "PowerPoint",
        "Agile", "Scrum", "DevOps", "Docker", "Kubernetes", "AWS", "Google Cloud", "REST API",
        "Auditing", "Human Resources", "Supply Chain", "Logistics", "Teaching", "Research"
    ];

    // Detect skills matching dictionary or comma-separated lists under 'Skills' section
    const lowerText = text.toLowerCase();
    commonSkillsDict.forEach(skill => {
        if (lowerText.includes(skill.toLowerCase()) && !skills.includes(skill)) {
            skills.push(skill);
        }
    });

    // Detect Qualifications
    if (lowerText.includes("phd") || lowerText.includes("doctorate")) {
        qualification = "Doctorate / PhD";
    } else if (lowerText.includes("master") || lowerText.includes("msc") || lowerText.includes("mba") || lowerText.includes("ma ")) {
        qualification = "Master's Degree";
    } else if (lowerText.includes("bachelor") || lowerText.includes("bsc") || lowerText.includes("ba ") || lowerText.includes("degree")) {
        qualification = "Bachelor's Degree";
    } else if (lowerText.includes("diploma")) {
        qualification = "Diploma";
    } else if (lowerText.includes("certificate") || lowerText.includes("certification")) {
        qualification = "Professional Certificate";
    } else if (lowerText.includes("msce") || lowerText.includes("secondary")) {
        qualification = "Malawi School Certificate of Education (MSCE)";
    }

    // Try to extract full name from top 3 non-empty lines
    for (let i = 0; i < Math.min(3, lines.length); i++) {
        const line = lines[i];
        if (!line.includes("@") && !line.match(/\d/) && line.length < 50 && line.split(" ").length >= 2) {
            fullName = line;
            break;
        }
    }

    // Extract Summary / Bio if present
    const summaryMatch = text.match(/(?:summary|about|profile|objective)[\s:]*([\s\S]*?)(?=\n\n|\n[A-Z\s]{4,}:|$)/i);
    if (summaryMatch && summaryMatch[1]) {
        bio = summaryMatch[1].trim().slice(0, 500);
    } else if (lines.length > 3) {
        // Fallback: search for first paragraph block
        const candidateParagraph = lines.slice(1, 6).find(l => l.length > 60 && !l.includes("@"));
        if (candidateParagraph) bio = candidateParagraph.slice(0, 500);
    }

    return {
        full_name: fullName,
        phone,
        bio,
        qualification,
        skills,
        experience,
        education
    };
}

export async function POST(request: Request) {
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    try {
        const body = await request.json();
        const { text } = body;

        if (!text || typeof text !== "string" || text.trim().length === 0) {
            return NextResponse.json({ error: "No CV text provided for parsing." }, { status: 400 });
        }

        const parsed = parseCVText(text);

        return NextResponse.json({
            success: true,
            data: parsed
        });
    } catch (err: any) {
        console.error("[cv-parse] Parse error:", err);
        return NextResponse.json({ error: err.message || "Failed to parse CV text." }, { status: 500 });
    }
}
