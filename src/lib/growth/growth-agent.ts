import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getMarketIntelligence, MarketIntelligenceSummary } from "./market-intelligence";

export interface GeneratedPostSlot {
  targetAccount: "FOUNDER" | "COMPANY";
  targetChannel: "LINKEDIN" | "FACEBOOK" | "GENERAL";
  scheduledDay: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  scheduledTime: string; // e.g. "08:00"
  contentPillar: string;
  openingHook: string;
  coreMessage: string;
  proposedCaption: string;
  creativeBrief: string; // Instructions for Canva / offline graphic design
  callToAction: string;
  hashtags: string[];
}

export interface GrowthAgentRunResult {
  runId: string;
  summary: string;
  marketIntelligence: MarketIntelligenceSummary;
  suggestions: GeneratedPostSlot[];
}

export type LanguageMode = "ENGLISH" | "BILINGUAL";

/**
 * Executes a Growth Agent content planning run:
 * 1. Collects deterministic hiring & domain frequency data.
 * 2. Uses Gemini to formulate strategic "What to post" & "When to post" recommendations.
 * 3. Saves the suggestions and creative briefs to Supabase for admin review.
 */
export async function runGrowthAgentPlanner(
  runType: "WEEKLY" | "MANUAL" = "MANUAL",
  languageMode: LanguageMode = "ENGLISH"
): Promise<GrowthAgentRunResult> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("[GrowthAgent] Supabase admin client unavailable.");
  }

  // Record run initiation
  const { data: runRecord, error: runError } = await supabase
    .from("growth_agent_runs")
    .insert({
      run_type: runType,
      status: "RUNNING",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (runError || !runRecord) {
    throw new Error(`[GrowthAgent] Failed to create run record: ${runError?.message}`);
  }

  const runId = runRecord.id;

  try {
    // 1. Gather deterministic market intelligence
    const market = await getMarketIntelligence(30);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("[GrowthAgent] GEMINI_API_KEY is not set in environment.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const languageInstruction = languageMode === "BILINGUAL"
      ? "LANGUAGE STYLE: Use Bilingual communication (English with natural, relatable Chichewa idioms, greetings, and expressions where fitting, especially for Facebook and community-oriented posts)."
      : "LANGUAGE STYLE: Clear, articulate English with localized Malawian context.";

    // 2. Formulate Prompt with Real Data Constraints
    const prompt = `
You are the Chief Growth & Content Strategist for Aganyu (an innovative employment marketplace & career platform in Malawi).
Your mission is to produce a comprehensive weekly social media content schedule ("What to post" and "When to post") for two distinct voices:
1. FOUNDER PERSONAL BRAND (Emmanuel Nyang'azie / Founder): First-person, authentic startup lessons, building in public, insights from Malawian labor data, engineering decisions, and founder reflections.
2. AGANYU OFFICIAL COMPANY ACCOUNT: Authoritative, customer-focused, platform education, labor market insights, employer conversion, and professional opportunity updates.

${languageInstruction}

REAL VERIFIED PLATFORM DATA (LAST 30 DAYS):
- Total Active Jobs: ${market.totalActiveJobs}
- New Jobs in Period: ${market.newJobsInPeriod}
- Verified Employers: ${market.verifiedEmployersCount}
- Top In-Demand Disciplines/Domains: ${JSON.stringify(market.topDomains.slice(0, 5))}
- Top In-Demand Job Titles: ${JSON.stringify(market.topJobTitles.slice(0, 7))}

SCHEDULE RULES (AFRICA/BLANTYRE LOCAL TIME):
FOUNDER SCHEDULE (4 posts):
- Monday 08:00 (Founder reflection / weekly startup direction)
- Tuesday 12:15 (Technology, data or entrepreneurship insight from Malawian labor trends)
- Wednesday 08:00 (Building in public: engineering, product decisions, matching quality)
- Friday 08:00 (Weekly progress, transparent wins & challenges)

COMPANY SCHEDULE (4 posts):
- Monday 10:00 (Product value, candidate discovery education & how qualifications match)
- Tuesday 09:00 (Deep, actionable Employer Recruitment Advice tied directly to the trending domains)
- Thursday 10:00 (Deep, practical Job Seeker Career & Application Advice for in-demand roles)
- Friday 10:00 (Employer conversion & weekly hiring landscape summary)

IMPORTANT INSTRUCTIONS FOR TACTICAL DEPTH & VOICE:
1. DEEP TACTICAL TIPS FOR EMPLOYERS:
   - Do NOT give surface-level generic tips (like "hire good people").
   - Give deep, actionable advice based on the top domains. For example: If Accounting or Tech is trending, explain how to structure technical assessments, write clear qualification requirements, evaluate local vs regional experience, reduce time-to-hire, and screen applicants effectively using Aganyu.
2. DEEP TACTICAL TIPS FOR JOB SEEKERS:
   - Provide concrete career guidance for the roles actually in demand (e.g. how candidates in the top domains should structure their CV qualifications, highlight verified skills, ace domain-specific interviews, or prepare for common requirements).
3. FOUNDER VOICE:
   - Grounded, thoughtful, first-person startup insights connecting technology to local Malawian market realities.
4. CREATIVE BRIEF FOR OFFLINE DESIGN:
   - For EVERY post, include a detailed "creativeBrief" for offline graphic designers (Canva/Figma), describing:
     a) Recommended Visual Format (e.g. 1:1 Carousel of 3 slides, Step-by-Step Infographic, or Data Stat Card).
     b) Exact Headline and Sub-points to put on the slides.
     c) Visual aesthetic: Aganyu branding colors (Clean Blue/White), icons, or diagram suggestions.
- Output ONLY valid JSON matching this exact structure:
{
  "summary": "Brief executive summary of this week's content focus and dominant labor market themes",
  "slots": [
    {
      "targetAccount": "FOUNDER" | "COMPANY",
      "targetChannel": "LINKEDIN" | "FACEBOOK" | "GENERAL",
      "scheduledDay": "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday",
      "scheduledTime": "08:00",
      "contentPillar": "Short pillar name",
      "openingHook": "First 1-2 attention grabbing sentences",
      "coreMessage": "Core takeaway for the reader",
      "proposedCaption": "Complete post body ready to post",
      "creativeBrief": "Detailed instructions for designing the image/carousel off-platform in Canva/Figma",
      "callToAction": "Clear next action",
      "hashtags": ["#Aganyu", "#Malawi", "..."]
    }
  ]
}
`;

    const result = await model.generateContent(prompt);
    const rawResponse = result.response.text();
    const parsed = JSON.parse(rawResponse);

    const suggestions: GeneratedPostSlot[] = parsed.slots || [];

    // 3. Persist suggestions in database
    if (suggestions.length > 0) {
      const dbRows = suggestions.map((slot) => ({
        run_id: runId,
        target_account: slot.targetAccount,
        target_channel: slot.targetChannel || "LINKEDIN",
        content_pillar: slot.contentPillar || "Growth",
        scheduled_day: slot.scheduledDay,
        scheduled_time: slot.scheduledTime,
        timezone: "Africa/Blantyre",
        opening_hook: slot.openingHook,
        core_message: slot.coreMessage,
        proposed_caption: slot.proposedCaption,
        creative_brief: slot.creativeBrief,
        evidence_data: {
          topDomains: market.topDomains.slice(0, 3),
          totalActiveJobs: market.totalActiveJobs,
        },
        hashtags: slot.hashtags || [],
        call_to_action: slot.callToAction,
        status: "SUGGESTED",
      }));

      await supabase.from("growth_agent_suggestions").insert(dbRows);
    }

    // 4. Update run record
    await supabase
      .from("growth_agent_runs")
      .update({
        status: "COMPLETED",
        summary: parsed.summary || "Weekly content plan generated successfully.",
        metrics_snapshot: market,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);

    return {
      runId,
      summary: parsed.summary || "",
      marketIntelligence: market,
      suggestions,
    };
  } catch (err: any) {
    console.error("[GrowthAgent] Run failed:", err);
    await supabase
      .from("growth_agent_runs")
      .update({
        status: "FAILED",
        error_message: err.message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);

    throw err;
  }
}

/**
 * Regenerates an individual post suggestion with custom refinement instructions
 */
export async function regenerateSinglePostSlot(
  suggestionId: string,
  userCustomInstruction?: string,
  languageMode: LanguageMode = "ENGLISH"
): Promise<GeneratedPostSlot> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("[GrowthAgent] Supabase admin client unavailable.");
  }

  const { data: existing, error } = await supabase
    .from("growth_agent_suggestions")
    .select("*")
    .eq("id", suggestionId)
    .single();

  if (error || !existing) {
    throw new Error(`[GrowthAgent] Suggestion not found: ${suggestionId}`);
  }

  const market = await getMarketIntelligence(30);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("[GrowthAgent] GEMINI_API_KEY is not set in environment.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const prompt = `
You are rewriting a single social media post slot for Aganyu's content schedule.
TARGET ACCOUNT: ${existing.target_account}
DAY & TIME: ${existing.scheduled_day} at ${existing.scheduled_time}
PREVIOUS PILLAR: ${existing.content_pillar}
PREVIOUS HOOK: ${existing.opening_hook}
PREVIOUS CAPTION: ${existing.proposed_caption}

${userCustomInstruction ? `USER SPECIFIC REVISION INSTRUCTION: "${userCustomInstruction}"` : "Please produce a fresh, engaging, high-impact alternative version."}

LANGUAGE STYLE: ${languageMode === "BILINGUAL" ? "Bilingual (English with natural, relatable Chichewa expressions/idioms)" : "Articulate English with authentic Malawian context"}

MARKET CONTEXT (Top Domains: ${JSON.stringify(market.topDomains.slice(0, 3))}, Top Roles: ${JSON.stringify(market.topJobTitles.slice(0, 4))})

Output ONLY valid JSON matching this structure:
{
  "targetAccount": "${existing.target_account}",
  "targetChannel": "${existing.target_channel}",
  "scheduledDay": "${existing.scheduled_day}",
  "scheduledTime": "${existing.scheduled_time}",
  "contentPillar": "${existing.content_pillar}",
  "openingHook": "First 1-2 attention grabbing sentences",
  "coreMessage": "Core takeaway for the reader",
  "proposedCaption": "Complete rewritten post body ready to post",
  "creativeBrief": "Detailed instructions for designing the image/carousel off-platform in Canva/Figma",
  "callToAction": "Clear next action",
  "hashtags": ["#Aganyu", "#Malawi"]
}
`;

  const result = await model.generateContent(prompt);
  const parsed: GeneratedPostSlot = JSON.parse(result.response.text());

  // Update in database
  await supabase
    .from("growth_agent_suggestions")
    .update({
      opening_hook: parsed.openingHook,
      core_message: parsed.coreMessage,
      proposed_caption: parsed.proposedCaption,
      creative_brief: parsed.creativeBrief,
      call_to_action: parsed.callToAction,
      hashtags: parsed.hashtags,
      updated_at: new Date().toISOString(),
    })
    .eq("id", suggestionId);

  return parsed;
}

