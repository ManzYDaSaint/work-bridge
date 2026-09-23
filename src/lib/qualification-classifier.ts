import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_MODEL = "gemini-3.1-flash-lite";

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/["'`.,;:]+$/g, "");
}

export async function classifyQualification(qualification: string, knownDomains: string[]): Promise<string> {
  const domains = knownDomains.map((domain) => domain.trim()).filter(Boolean);
  if (!qualification.trim() || domains.length === 0) return "unknown";
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const allowedDomainList = domains.map((domain) => `- ${domain}`).join("\n");
  const prompt = `
Classify the following job qualification into exactly one allowed domain.

Allowed domains:
${allowedDomainList}

Qualification: "${qualification}"

Rules:
1. Output only one exact domain name from the allowed list.
2. If none of the allowed domains fit, output only unknown.
3. Do not include punctuation, quotes, markdown, or explanations.
`;

  const result = await model.generateContent(prompt);
  const suggestion = normalizeDomain(result.response.text());
  const matched = domains.find((domain) => normalizeDomain(domain) === suggestion);
  return matched ?? "unknown";
}
