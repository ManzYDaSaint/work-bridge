import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const auth = await validateAuth();
    if (auth.error) return auth.error;
    if (auth.role !== "EMPLOYER" && auth.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();
    
    try {
        const { error } = await supabase
            .from("employer_saved_candidates")
            .insert({
                employer_id: auth.userId,
                seeker_id: params.id
            });

        if (error) {
            // 23505 is unique violation, which means it's already saved. Just ignore.
            if (error.code !== "23505") throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to save candidate" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();
    
    try {
        const { error } = await supabase
            .from("employer_saved_candidates")
            .delete()
            .match({ employer_id: auth.userId, seeker_id: params.id });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to unsave candidate" }, { status: 500 });
    }
}

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    // Check if a specific candidate is saved
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();
    
    const { data } = await supabase
        .from("employer_saved_candidates")
        .select("id")
        .match({ employer_id: auth.userId, seeker_id: params.id })
        .maybeSingle();

    return NextResponse.json({ isSaved: !!data });
}
