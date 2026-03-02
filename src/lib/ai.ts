import { GoogleGenerativeAI } from "@google/generative-ai";

// @ts-ignore - pdf-parse lacks proper ESM types in some environments
const pdf = require("pdf-parse");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Autonomous OCR-based Certificate Verification
 * Extracts text from a PDF, uses AI to verify name consistency and qualification tier.
 */
export async function verifyCertificateWithOCR(
    fileBuffer: Buffer,
    expectedFullName: string
): Promise<{
    isNameVerified: boolean;
    qualification: string;
    tier: number;
    confidence: number;
    summary: string;
}> {
    try {
        // 1. Extract Text from PDF
        const pdfData = await pdf(fileBuffer);
        const extractedText = pdfData.text;

        if (!extractedText || extractedText.trim().length < 50) {
            throw new Error("Could not extract sufficient text from the document.");
        }

        // 2. Use Gemini to analyze the document
        const prompt = `
            Analyze this extracted text from an academic/professional certificate:
            ---
            ${extractedText}
            ---
            The user's registered name is: "${expectedFullName}".

            Task:
            1. Determine if the name on the certificate matches the registered name (allow minor variations like middle names).
            2. Identify the specific qualification title (e.g., "Bachelor of Science in Computer Science").
            3. Classify the qualification into a tier:
               - 4: Doctorate (PhD, MD, etc.)
               - 3: Masters (MA, MSc, etc.) or Honours
               - 2: Bachelors (BA, BSc, etc.)
               - 1: Diploma
               - 0: Certificate
            4. Provide a brief 1-sentence summary status.

            Respond ONLY in JSON format:
            {
                "isNameVerified": boolean,
                "qualification": "string",
                "tier": number,
                "confidence": number, // 0 to 1
                "summary": "string"
            }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean the JSON response (strip markdown blocks if present)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("AI failed to provide a structured response.");

        return JSON.parse(jsonMatch[0]);

    } catch (err) {
        console.error("[OCR Verification] Error:", err);
        return {
            isNameVerified: false,
            qualification: "Unknown",
            tier: -1,
            confidence: 0,
            summary: "Automated verification failed due to internal error."
        };
    }
}

const SEMANTIC_MAP: Record<string, string[]> = {
    "frontend": ["react", "vue", "angular", "next.js", "tailwind", "css", "html", "javascript", "typescript", "framer motion", "three.js"],
    "backend": ["node.js", "python", "django", "flask", "go", "golang", "java", "spring", "postgresql", "sql", "prisma", "supabase"],
    "mobile": ["react native", "flutter", "swift", "kotlin", "ios", "android", "expo"],
    "database": ["postgresql", "mysql", "mongodb", "redis", "dynamodb", "sql", "nosql", "drizzle", "neon"],
    "cloud": ["aws", "azure", "gcp", "docker", "kubernetes", "terraform", "serverless", "vercel", "netlify"],
    "devops": ["jenkins", "github actions", "gitlab ci", "circleci", "ansible", "prometheus", "grafana"],
    "ai_ml": ["openai", "gemini", "langchain", "llama", "pytorch", "tensorflow", "scikit-learn", "hugging face"],
    "security": ["oauth", "jwt", "penetration testing", "firewall", "encryption", "infosec"]
};

/** Tier system: higher tier = more advanced qualification */
const QUALIFICATION_TIERS: { regex: RegExp; tier: number }[] = [
    { regex: /\b(doctoral|doctor\s*of|ph\.?\s*d\.?|doctorate)\b/i, tier: 4 },
    { regex: /\b(master\s*of|m\.?\s*sc\.?|m\.?\s*a\.?|m\.?\s*eng\.?|honours)\b/i, tier: 3 },
    { regex: /\b(bachelor\s*of|b\.?\s*sc\.?|b\.?\s*a\.?|b\.?\s*com\.?|b\.?\s*eng\.?|b\.?\s*tech\.?|undergraduate|degree)\b/i, tier: 2 },
    { regex: /\b(higher\s*diploma|national\s*diploma|diploma)\b/i, tier: 1 },
    { regex: /\b(certificate\s*(in|of)|advanced\s*certificate|national\s*certificate)\b/i, tier: 0 },
];

const JOB_QUAL_REQUIREMENTS: { regex: RegExp; minTier: number }[] = [
    { regex: /\b(phd|doctorate)\s*(required|preferred|is\s+required)\b/i, minTier: 4 },
    { regex: /\b(master'?s?|honours)\s*(degree\s*)?(required|preferred|is\s+required)\b/i, minTier: 3 },
    { regex: /\b(degree|bachelor'?s?)\s*(required|preferred|is\s+required|or\s+above)\b/i, minTier: 2 },
    { regex: /\b(diploma)\s*(required|preferred|is\s+required|or\s+above)\b/i, minTier: 1 },
];

function getQualTier(qualText: string): number {
    for (const { regex, tier } of QUALIFICATION_TIERS) {
        if (regex.test(qualText)) return tier;
    }
    return -1;
}

function getJobRequiredTier(jobDescription: string): number {
    for (const { regex, minTier } of JOB_QUAL_REQUIREMENTS) {
        if (regex.test(jobDescription)) return minTier;
    }
    return -1;
}

export interface CertificateInput {
    parsedQualification?: string | null;
    isNameVerified: boolean;
}

/**
 * Main scoring function.
 * Skills: up to 85 points. Qualification bonus: up to 15 points (only verified certs count).
 */
export async function getSemanticMatchScore(
    seekerSkills: string[] = [],
    jobSkills: string[] = [],
    seekerBio: string = "",
    jobDescription: string = "",
    certificates: CertificateInput[] = []
): Promise<{ score: number; justification: string }> {
    const normalizedSeeker = seekerSkills.map(s => s.toLowerCase());

    // ── Skills ────────────────────────────────────────────────────────────────
    const directMatches = jobSkills.filter(s => normalizedSeeker.includes(s.toLowerCase()));

    const semanticMatches: string[] = [];
    jobSkills.forEach(js => {
        if (directMatches.includes(js)) return;
        for (const [, skills] of Object.entries(SEMANTIC_MAP)) {
            if (skills.includes(js.toLowerCase()) && skills.some(s => normalizedSeeker.includes(s))) {
                semanticMatches.push(js);
                break;
            }
        }
    });

    const totalSkillMatches = directMatches.length + semanticMatches.length * 0.5;
    const skillScore = jobSkills.length > 0
        ? Math.min(85, Math.round((totalSkillMatches / jobSkills.length) * 85))
        : 85;

    // ── Qualification bonus (verified certs only) ─────────────────────────────
    let qualBonus = 0;
    let qualJustification = "";

    // Pick the highest-tier verified certificate
    const verifiedCerts = certificates.filter(c => c.isNameVerified && c.parsedQualification);
    const bestTier = verifiedCerts.reduce((best, c) => {
        const t = getQualTier(c.parsedQualification!);
        return t > best ? t : best;
    }, -1);

    // Also consider unverified certs for a smaller bonus
    const anyQualTier = certificates.reduce((best, c) => {
        const t = c.parsedQualification ? getQualTier(c.parsedQualification) : -1;
        return t > best ? t : best;
    }, -1);

    const jobRequiredTier = getJobRequiredTier(jobDescription);

    if (bestTier >= 0) {
        if (jobRequiredTier >= 0) {
            if (bestTier >= jobRequiredTier) {
                qualBonus = 15;
                qualJustification = "Verified certificate meets the required qualification level. ";
            } else {
                qualBonus = 7;
                qualJustification = "Has a verified academic credential, though the role may require a higher level. ";
            }
        } else {
            qualBonus = 10;
            qualJustification = `${verifiedCerts.length} verified academic certificate(s) on record. `;
        }
    } else if (anyQualTier >= 0) {
        qualBonus = 4;
        qualJustification = "Academic certificate uploaded (name verification pending). ";
    }

    const score = Math.min(100, skillScore + qualBonus);

    // ── Justification text ────────────────────────────────────────────────────
    let justification = qualJustification;
    if (directMatches.length > 0) justification += `Directly matches ${directMatches.length} core skill(s). `;
    if (semanticMatches.length > 0) justification += `Demonstrates semantic proficiency in ${semanticMatches.join(", ")} through related experience. `;
    if (score > 85) justification += "Excellent alignment with your operational requirements.";
    else if (score > 60) justification += "Strong potential with minor skill gaps manageable through onboarding.";

    return { score, justification };
}

export function generateAnonymizedSummary(bio: string): string {
    return bio
        .replace(/[a-zA-Z0-9.-]+@[a-zA-Z0-9.-]+\.[a-zA-Z0-9.-]+/g, "[REDACTED EMAIL]")
        .replace(/\b[0-9]{10}\b/g, "[REDACTED PHONE]")
        .replace(/\b(My name is|I am) [A-Z][a-z]+ [A-Z][a-z]+\b/gi, "$1 [REDACTED NAME]");
}
