import { z } from "zod";

export const employerProfileSchema = z.object({
    companyName: z.string().min(2, "Company name must be at least 2 characters"),
    industry: z.string().min(1, "Industry is required"),
    location: z.string().min(1, "Location is required"),
    website: z.string().url("Invalid website URL").optional().or(z.literal("")),
    description: z.string().min(10, "Description must be at least 10 characters").optional(),
    applicationAlerts: z.boolean().optional(),
    logoUrl: z.string().url("Invalid logo URL").optional().or(z.literal("")),
    recruitmentEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
    recruitmentUrl: z.string().url("Invalid recruitment URL (must start with https://)").optional().or(z.literal("")),
    defaultApplicationMethod: z.enum(["one_tap", "external_url", "email", "whatsapp", "phone"]).optional(),
    defaultApplyPhone: z.string().optional(),
    defaultApplyWhatsapp: z.string().optional(),
    defaultSchedulingLink: z.string().url("Invalid calendar URL (must start with https://)").optional().or(z.literal("")),
});

export type EmployerProfileValues = z.infer<typeof employerProfileSchema>;
