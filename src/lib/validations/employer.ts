import { z } from "zod";

export const employerProfileSchema = z.object({
    companyName: z.string().min(2, "Company name must be at least 2 characters"),
    industry: z.string().min(1, "Industry is required"),
    location: z.string().min(1, "Location is required"),
    website: z.string().url("Invalid website URL").optional().or(z.literal("")),
    description: z.string().min(10, "Description must be at least 10 characters").optional(),
    applicationAlerts: z.boolean().optional(),
    logoUrl: z.string().url("Invalid logo URL").optional().or(z.literal("")),
});

export type EmployerProfileValues = z.infer<typeof employerProfileSchema>;
