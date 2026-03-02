import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
        .from("applications")
        .select(`
            id,
            job_id,
            user_id,
            status,
            created_at,
            job:jobs(
                id,
                title,
                type,
                employer:employers(
                    id,
                    company_name
                )
            )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Applications GET error:", error);
        return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
    }

    // Map snake_case to camelCase
    const formattedData = data.map(app => ({
        id: app.id,
        jobId: app.job_id,
        userId: app.user_id,
        status: app.status,
        createdAt: app.created_at,
        job: app.job ? {
            id: (app.job as any).id,
            title: (app.job as any).title,
            type: (app.job as any).type,
            employer: (app.job as any).employer ? {
                id: (app.job as any).employer.id,
                companyName: (app.job as any).employer.company_name
            } : undefined
        } : undefined
    }));

    return NextResponse.json(formattedData);
}
