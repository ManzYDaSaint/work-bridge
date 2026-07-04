import { z } from "zod";
import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { buildPublicJobSlug } from "@/lib/public-slugs";
import { syncJobEmbedding } from "@/lib/sync-embeddings";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const auth = await validateAuth(['EMPLOYER'], false, true);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", id)
        .eq("employer_id", auth.userId)
        .single();

    if (error) {
        return NextResponse.json({ error: "Job not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json(data);
}

const jobUpdateSchema = z.object({
    title: z.string().min(3).optional(),
    description: z.string().min(20).optional(),
    location: z.string().min(2).optional(),
    type: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"]).optional(),
    workMode: z.enum(["REMOTE", "HYBRID", "ON_SITE"]).optional(),
    skills: z.array(z.string()).optional(),
    mustHaveSkills: z.array(z.string()).optional(),
    niceToHaveSkills: z.array(z.string()).optional(),
    minimumYearsExperience: z.number().int().min(0).optional(),
    qualification: z.string().nullable().optional(),
    screeningQuestions: z.array(z.any()).optional(),
    salaryRange: z.string().nullable().optional(),
    deadline: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid deadline date").optional(),
    status: z.enum(["ACTIVE", "PENDING", "EXPIRED", "FILLED", "ARCHIVED"]).optional(),
});

const jobPartialUpdateSchema = z.object({
    title: z.string().min(3).optional(),
    deadline: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid deadline date").optional(),
    status: z.enum(["ACTIVE", "PENDING", "EXPIRED", "FILLED", "ARCHIVED"]).optional(),
});

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const auth = await validateAuth(['EMPLOYER'], false, true);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();
    try {
        const body = await request.json();
        const parsed = jobUpdateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
        }

        const updateData = {
            ...(parsed.data.title !== undefined && { title: parsed.data.title }),
            ...(parsed.data.description !== undefined && { description: parsed.data.description }),
            ...(parsed.data.location !== undefined && { location: parsed.data.location }),
            ...(parsed.data.type !== undefined && { type: parsed.data.type }),
            ...(parsed.data.workMode !== undefined && { work_mode: parsed.data.workMode }),
            ...(parsed.data.skills !== undefined && { skills: parsed.data.skills }),
            ...(parsed.data.mustHaveSkills !== undefined && { must_have_skills: parsed.data.mustHaveSkills }),
            ...(parsed.data.niceToHaveSkills !== undefined && { nice_to_have_skills: parsed.data.niceToHaveSkills }),
            ...(parsed.data.minimumYearsExperience !== undefined && { minimum_years_experience: parsed.data.minimumYearsExperience }),
            ...(parsed.data.qualification !== undefined && { qualification: parsed.data.qualification }),
            ...(parsed.data.screeningQuestions !== undefined && { screening_questions: parsed.data.screeningQuestions }),
            ...(parsed.data.salaryRange !== undefined && { salary_range: parsed.data.salaryRange }),
            ...(parsed.data.deadline !== undefined && { deadline: parsed.data.deadline }),
            ...(parsed.data.status !== undefined && { status: parsed.data.status }),
        };

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "No valid fields provided for update" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("jobs")
            .update(updateData)
            .eq("id", id)
            .eq("employer_id", auth.userId)
            .select()
            .single();

        if (error) throw error;

        // Sync semantic embedding for intelligent matchmaking
        await syncJobEmbedding(id, data);

        return NextResponse.json({ success: true, job: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to update job" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const auth = await validateAuth(['EMPLOYER'], false, true);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
        .from("jobs")
        .delete()
        .eq("id", id)
        .eq("employer_id", auth.userId);

    if (error) {
        return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const auth = await validateAuth(['EMPLOYER'], false, true);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();
    try {
        const body = await request.json();
        const repostSchema = z.object({
            deadline: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid deadline date").optional(),
        });
        const repostResult = repostSchema.safeParse(body);
        if (!repostResult.success) {
            return NextResponse.json({ error: repostResult.error.issues[0].message }, { status: 400 });
        }

        // Reposting: Create a NEW job based on the old one, but with a new deadline and status ACTIVE
        const { data: originalJob, error: fetchError } = await supabase
            .from("jobs")
            .select("*")
            .eq("id", id)
            .eq("employer_id", auth.userId)
            .single();

        if (fetchError || !originalJob) {
            return NextResponse.json({ error: "Original job not found" }, { status: 404 });
        }

        // --- Enforce active job limit on repost ---
        const { count: activeJobCount } = await supabase
            .from("jobs")
            .select("id", { count: "exact", head: true })
            .eq("employer_id", auth.userId)
            .eq("status", "ACTIVE");

        if ((activeJobCount || 0) >= 2) {
            return NextResponse.json({
                error: "You've reached the 2 active job limit. Close or fill an existing job before reposting."
            }, { status: 403 });
        }

        const { data: createdJob, error: insertError } = await supabase
            .from("jobs")
            .insert({
                employer_id: auth.userId,
                title: originalJob.title,
                description: originalJob.description,
                location: originalJob.location,
                type: originalJob.type,
                work_mode: originalJob.work_mode,
                skills: originalJob.skills,
                must_have_skills: originalJob.must_have_skills,
                nice_to_have_skills: originalJob.nice_to_have_skills,
                minimum_years_experience: originalJob.minimum_years_experience,
                qualification: originalJob.qualification,
                screening_questions: originalJob.screening_questions,
                salary_range: originalJob.salary_range,
                deadline: body.deadline, // Expecting a new deadline from the request
                status: 'ACTIVE',
            })
            .select()
            .single();

        if (insertError) throw insertError;

        const publicSlug = buildPublicJobSlug(createdJob.title, createdJob.id);
        const { data: newJob, error: slugError } = await supabase
            .from("jobs")
            .update({ public_slug: publicSlug })
            .eq("id", createdJob.id)
            .select()
            .single();

        if (slugError) throw slugError;

        // Sync semantic embedding for the new reposted job
        await syncJobEmbedding(newJob.id, newJob);

        return NextResponse.json({ success: true, job: newJob });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to repost job" }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const auth = await validateAuth(['EMPLOYER'], false, true);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();
    try {
        const body = await request.json();
        const parsed = jobPartialUpdateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
        }

        const updateData: any = {};
        if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
        if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
        if (parsed.data.deadline !== undefined) updateData.deadline = parsed.data.deadline;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("jobs")
            .update(updateData)
            .eq("id", id)
            .eq("employer_id", auth.userId)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, job: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to partial update job" }, { status: 500 });
    }
}
