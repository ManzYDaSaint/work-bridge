import { validateAuth } from "@/lib/auth-guard";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const GEMINI_MODEL = "gemini-3.1-flash-lite";

export async function POST(request: Request) {
  const auth = await validateAuth(["ADMIN"], false);
  if (auth.error) return auth.error;

  const { domainName, description } = await request.json().catch(() => ({}));
  const name = String(domainName ?? "").trim();
  const desc = String(description ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "Domain name is required" }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `
You are an expert HR and recruitment taxonomy assistant for the African and global job market.
Given a qualification domain name and optional description, generate 8 to 15 relevant keywords, degree titles, certifications, skills, and industry terms that belong to this domain.

Domain Name: "${name}"
Description: "${desc || "N/A"}"

Rules:
1. Output ONLY a clean, comma-separated list of keywords.
2. Include common degree abbreviations (e.g., BSc, Diploma, MSc, ACCA, PhD where appropriate).
3. Do NOT include bullet points, numbers, quotes, or markdown formatting.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const keywords = text
      .split(/[,;\n]+/)
      .map((k) => k.replace(/["'`.,;:-]+/g, "").trim())
      .filter((k) => k.length > 1);

    return NextResponse.json({ keywords });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate keywords";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
