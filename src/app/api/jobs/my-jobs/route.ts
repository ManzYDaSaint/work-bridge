import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: employer, error: empError } = await supabase
        .from("employers")
        .select("id")
        .eq("id", user.id)
        .single();

    if (empError || !employer) {
        return NextResponse.json({ error: "Employer profile not found" }, { status: 404 });
    }

    const { data, error } = await supabase
        .from("jobs")
        .select(`
            *,
            employer:employers(company_name, id),
            applications(count)
        `)
        .eq("employer_id", employer.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("My Jobs GET error:", error);
        return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
    }

    // Format to camelCase
    const formattedData = data.map(job => ({
        id: job.id,
        title: job.title,
        description: job.description,
        location: job.location,
        type: job.type,
        skills: job.skills,
        isNew: job.is_new,
        createdAt: job.created_at,
        employer: job.employer ? {
            id: (job.employer as any).id,
            companyName: (job.employer as any).company_name
        } : undefined,
        _count: {
            applications: job.applications?.[0]?.count ?? 0
        }
    }));

    return NextResponse.json(formattedData);
}
