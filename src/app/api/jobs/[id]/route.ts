import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

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

        const { data, error } = await supabase
            .from("jobs")
            .update({
                title: body.title,
                description: body.description,
                location: body.location,
                type: body.type,
                work_mode: body.workMode,
                skills: body.skills,
                must_have_skills: body.mustHaveSkills || body.skills || [],
                nice_to_have_skills: body.niceToHaveSkills || [],
                minimum_years_experience: body.minimumYearsExperience || 0,
                qualification: body.qualification || null,
                screening_questions: body.screeningQuestions || [],
                salary_range: body.salaryRange,
                deadline: body.deadline,
                status: body.status,
            })
            .eq("id", id)
            .eq("employer_id", auth.userId)
            .select()
            .single();

        if (error) throw error;

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

        const { data: newJob, error: insertError } = await supabase
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

        // Only update fields explicitly provided in the payload
        const updateData: any = {};
        if (body.status !== undefined) updateData.status = body.status;
        
        // Add minimal safeguard for partial updates extending to other fields if ever needed
        if (body.title !== undefined) updateData.title = body.title;
        if (body.deadline !== undefined) updateData.deadline = body.deadline;

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
