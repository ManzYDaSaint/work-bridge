import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createSupabaseServerClient();
    const { id } = await params;
    const { data, error } = await supabase
        .from("jobs")
        .select(`
            *,
            employer:employers(company_name, id)
        `)
        .eq("id", id)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(data);
}
