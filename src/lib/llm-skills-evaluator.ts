/**
 * Gemini LLM Semantic Skills Evaluator
 *
 * Evaluates how well a seeker's skills match a job's required skills
 * using natural language understanding instead of exact string matching.
 *
 * "Coding" → matches "Programming"
 * "Web Design and Development" → partially matches "JavaScript", "PHP"
 * "Software Design and Development" → partially matches "relational databases"
 *
 * Returns a 0–100 score with a brief reasoning string.
 * Falls back to rule-based score on API failure or missing key.
 */

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent";

export interface LLMSkillsEvalResult {
  score: number;          // 0–100
  reasoning: string;
  fromLLM: boolean;       // false = fell back to rule-based
  matchedConcepts: string[];
}

/**
 * Calls Gemini to semantically score how well seekerSkills match jobRequiredSkills.
 * Falls back to a simple rule-based overlap score if Gemini is unavailable.
 */
export async function evaluateSkillsWithGemini(
  jobTitle: string,
  jobRequiredSkills: string[] | string | null,
  seekerSkills: string[] | string | null,
  fallbackRuleScore: number
): Promise<LLMSkillsEvalResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  const reqSkillsArr = Array.isArray(jobRequiredSkills)
    ? jobRequiredSkills
    : typeof jobRequiredSkills === "string" ? [jobRequiredSkills] : [];
  const seekerSkillsArr = Array.isArray(seekerSkills)
    ? seekerSkills
    : typeof seekerSkills === "string" ? [seekerSkills] : [];

  if (!apiKey || reqSkillsArr.length === 0) {
    return {
      score: seekerSkillsArr.length > 0 ? fallbackRuleScore : 0,
      reasoning: "No Gemini API key or no required skills — rule-based fallback used.",
      fromLLM: false,
      matchedConcepts: []
    };
  }

  const prompt = `You are an expert Malawian recruitment specialist evaluating candidate skills.

JOB TITLE: ${jobTitle}
REQUIRED SKILLS: ${reqSkillsArr.join(", ")}
CANDIDATE SKILLS: ${seekerSkillsArr.join(", ")}

Evaluate how well the candidate's skills cover the job's required skills. Use semantic understanding — for example, "Programming" covers "Coding", "Web Design and Development" partially covers "JavaScript" and "PHP", "Software Development" implies knowledge of "databases".

Return ONLY valid JSON in this exact format:
{
  "score": <integer 0-100>,
  "reasoning": "<one sentence explanation>",
  "matched_concepts": ["<skill1>", "<skill2>"]
}

Score guide:
- 90-100: Candidate clearly has all or nearly all required skills
- 70-89: Strong overlap, minor gaps
- 50-69: Moderate overlap, some gaps but relevant background
- 30-49: Partial overlap, significant gaps
- 0-29: Minimal relevance`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 256,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const body = await response.json();
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty Gemini response");

    const parsed = JSON.parse(text);
    const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));

    console.log(`[LLMSkills] Gemini score: ${score}/100 — ${parsed.reasoning}`);

    return {
      score,
      reasoning: parsed.reasoning || "",
      fromLLM: true,
      matchedConcepts: Array.isArray(parsed.matched_concepts) ? parsed.matched_concepts : []
    };

  } catch (err: any) {
    console.warn(`[LLMSkills] Gemini call failed, using rule-based fallback: ${err.message}`);
    return {
      score: fallbackRuleScore,
      reasoning: `Gemini unavailable — rule-based fallback: ${fallbackRuleScore}/100`,
      fromLLM: false,
      matchedConcepts: []
    };
  }
}
