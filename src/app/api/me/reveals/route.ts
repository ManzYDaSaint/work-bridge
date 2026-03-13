import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
    const auth = await validateAuth(["JOB_SEEKER"]);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    const { data: requests, error } = await supabase
        .from("profile_reveals")
        .select(`
            id,
            status,
            created_at,
            employers (
                id,
                company_name
            )
        `)
        .eq("seeker_id", auth.userId)
        .eq("status", "PENDING")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Reveals fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
    }

    const mapped = requests.map(r => ({
        id: r.id,
        status: r.status,
        createdAt: r.created_at,
        employer: {
            id: (r.employers as any).id,
            companyName: (r.employers as any).company_name
        }
    }));

    return NextResponse.json(mapped);
}
