import { z } from "zod";

export const seekerProfileSchema = z.object({
    fullName: z.string().min(2, "Full name must be at least 2 characters."),
    location: z.string().optional(),
    bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
    skills: z.array(z.string()).optional(),
    experience: z.array(z.object({
        role: z.string().min(1, "Role is required"),
        company: z.string().min(1, "Company is required"),
        startDate: z.string().min(1, "Start date is required"),
        endDate: z.string().optional(),
        description: z.string().min(1, "Description is required"),
    })).optional(),
    salaryExpectation: z.string().optional(),
    seniorityLevel: z.string().optional(),
    employmentType: z.string().optional(),
    emailAlias: z.string().email("Invalid email").optional().or(z.literal("")),
    privacyLevel: z.string().optional(),
    newJobAlerts: z.boolean().optional(),
    appStatusPulse: z.boolean().optional(),
    marketingInsights: z.boolean().optional(),
});

export type SeekerProfileValues = z.infer<typeof seekerProfileSchema>;
