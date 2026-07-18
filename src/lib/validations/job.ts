import { z } from "zod";
import { ScreeningAnswer, ScreeningQuestion } from "@/types";

const APPLICATION_METHODS = ['one_tap', 'external_url', 'email', 'whatsapp', 'phone', 'manual'] as const;
const POSTING_TYPES = ['DIRECT', 'AGENCY', 'AGANYU'] as const;

export const jobSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().min(20, "Description must be at least 20 characters"),
    location: z.string().min(2, "Location is required"),
    type: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"], {
        message: "Please select a valid job type"
    }),
    workMode: z.enum(["REMOTE", "HYBRID", "ON_SITE"], {
        message: "Please choose how the role is delivered",
    }),
    skills: z.array(z.string()).min(1, "Add at least one skill requirement"),
    mustHaveSkillsInput: z.string().optional(),
    niceToHaveSkillsInput: z.string().optional(),
    minimumYearsExperience: z.coerce.number().min(0).optional(),
    qualification: z.string().optional(),
    screeningQuestionsInput: z.string().optional(),
    salaryRange: z.string().optional(),
    deadline: z.string().min(1, "Deadline is required"),
    status: z.enum(["ACTIVE", "PENDING", "EXPIRED", "FILLED", "ARCHIVED"]).optional(),
    // ── Architecture V2 ──────────────────────────────────────────────────
    applicationMethod: z.enum(APPLICATION_METHODS).optional(),
    externalApplyUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
    applyEmail: z.string().email("Please enter a valid email").optional().or(z.literal("")),
    applyWhatsapp: z.string().optional(),
    applyPhone: z.string().optional(),
    applicationInstructions: z.string().optional(),
    allowOneTapApply: z.boolean().optional(),
    postingType: z.enum(POSTING_TYPES).optional(),
    displayCompanyName: z.string().optional(),
    jobSource: z.string().optional(),
});

export type JobValues = z.infer<typeof jobSchema>;
export { APPLICATION_METHODS, POSTING_TYPES };

/** Comma-separated skills → array (supports English comma and ideographic comma) */
export function parseCommaSkills(input: string): string[] {
    return input
        .split(/[,，]/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
}

export function serializeCommaSkills(input?: string[] | null): string {
    return (input || []).join(", ");
}

export function parseScreeningQuestions(input?: string): ScreeningQuestion[] {
    return (input || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => {
            const [questionText, expectedRaw, requiredRaw] = line.split("|").map((part) => part?.trim());
            const expectedAnswer: ScreeningAnswer = expectedRaw?.toUpperCase() === "NO" ? "NO" : "YES";
            const required = requiredRaw ? requiredRaw.toLowerCase() !== "optional" : true;
            return {
                id: `q${index + 1}`,
                question: questionText,
                expectedAnswer,
                required,
            };
        })
        .filter((item) => item.question);
}

export function serializeScreeningQuestions(questions?: ScreeningQuestion[] | null): string {
    return (questions || [])
        .map((question) => `${question.question} | ${question.expectedAnswer} | ${question.required ? "required" : "optional"}`)
        .join("\n");
}

/** Fast “post a job” form — essentials first; deadline optional (server defaults). */
export const jobQuickFormSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().min(20, "Use at least 20 characters so candidates understand the role"),
    location: z.string().min(2, "Location is required"),
    type: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"], {
        message: "Please select a valid job type",
    }),
    workMode: z.enum(["REMOTE", "HYBRID", "ON_SITE"], {
        message: "Please choose how the role is delivered",
    }),
    skillsInput: z
        .string()
        .min(1, "Add at least one skill")
        .refine((s) => parseCommaSkills(s).length >= 1, {
            message: "Enter at least one skill (comma-separated)",
        }),
    mustHaveSkillsInput: z.string().optional(),
    niceToHaveSkillsInput: z.string().optional(),
    minimumYearsExperience: z.coerce.number().min(0).optional(),
    qualification: z.string().optional(),
    screeningQuestionsInput: z.string().optional(),
    salaryRange: z.string().optional(),
    deadline: z.string().optional(),
    status: z.enum(["ACTIVE", "PENDING", "EXPIRED", "FILLED", "ARCHIVED"]).optional(),
    // ── Architecture V2 ──────────────────────────────────────────────────────
    applicationMethod: z.enum(APPLICATION_METHODS).optional(),
    externalApplyUrl: z.string().optional(),
    applyEmail: z.string().optional(),
    applyWhatsapp: z.string().optional(),
    applyPhone: z.string().optional(),
    applicationInstructions: z.string().optional(),
    allowOneTapApply: z.boolean().optional(),
    postingType: z.enum(POSTING_TYPES).optional(),
    displayCompanyName: z.string().optional(),
    jobSource: z.string().optional(),
});

export type JobQuickFormValues = z.infer<typeof jobQuickFormSchema>;
