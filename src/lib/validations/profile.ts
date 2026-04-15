import { z } from "zod";

export const seekerProfileSchema = z.object({
    full_name: z.string().min(2, "Full name must be at least 2 characters."),
    location: z.string().optional(),
    phone: z.string().min(5, "Contact number must be at least 5 digits.").optional().or(z.literal("")),
    whatsapp: z.boolean().default(false).optional(),
    bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
    skills: z.array(z.string()).optional(),
    experience: z.array(z.object({
        role: z.string().min(1, "Role is required"),
        company: z.string().min(1, "Company is required"),
        startDate: z.string().min(1, "Start date is required"),
        endDate: z.string().optional(),
        description: z.string().min(1, "Description is required"),
    })).optional(),
    education: z.array(z.object({
        certificate: z.string().optional(),
        institution: z.string().min(1, "Institution is required"),
        startDate: z.string().min(1, "Start date is required"),
        endDate: z.string().optional(),
    })).optional(),
    salaryExpectation: z.string().optional(),
    seniorityLevel: z.string().optional(),
    employmentType: z.string().optional(),
});

export type SeekerProfileValues = z.infer<typeof seekerProfileSchema>;
