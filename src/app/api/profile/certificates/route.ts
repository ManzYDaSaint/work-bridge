import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .eq("seeker_id", auth.userId)
        .order("issue_date", { ascending: false });

    if (error) {
        return NextResponse.json({ error: "Failed to fetch certificates" }, { status: 500 });
    }

    return NextResponse.json(data || []);
}

export async function POST(request: Request) {
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();
    
    try {
        const body = await request.json();
        
        // Basic validation
        if (!body.title) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("certificates")
            .insert({
                seeker_id: auth.userId,
                title: body.title,
                issuer: body.issuer,
                issue_date: body.issue_date || null,
                credential_url: body.credential_url,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to add certificate" }, { status: 500 });
    }
}
