import { z } from "zod";

export const jobSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().min(20, "Description must be at least 20 characters"),
    location: z.string().min(2, "Location is required"),
    type: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"], {
        message: "Please select a valid job type"
    }),
    skills: z.array(z.string()).min(1, "Add at least one skill requirement"),
    salaryRange: z.string().optional(),
});

export type JobValues = z.infer<typeof jobSchema>;
