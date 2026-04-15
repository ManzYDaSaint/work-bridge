import { z } from "zod";
import { ScreeningAnswer, ScreeningQuestion } from "@/types";

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
});

export type JobValues = z.infer<typeof jobSchema>;

/** Comma-separated skills → array (supports English comma and ideographic comma) */
export function parseCommaSkills(input: string): string[] {
    return input
        .split(/[,，]/)
        .map((s) => s.trim())
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
});

export type JobQuickFormValues = z.infer<typeof jobQuickFormSchema>;
