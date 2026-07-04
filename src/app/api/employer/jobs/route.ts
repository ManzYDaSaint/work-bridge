import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch only active jobs for the employer
        const { data: jobs, error } = await supabase
            .from("jobs")
            .select("id, title")
            .eq("employer_id", user.id)
            .eq("status", "ACTIVE")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Fetch Active Jobs Error:", error);
            return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
        }

        return NextResponse.json({ jobs });
    } catch (error: any) {
        console.error("Fetch Active Jobs API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
