import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await validateAuth(["EMPLOYER", "ADMIN"], false, true);
    if (auth.error) return auth.error;

    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    
    try {
        // --- Saved Candidates Limit: 15 max ---
        const { count: savedCount } = await supabase
            .from("employer_saved_candidates")
            .select("id", { count: "exact", head: true })
            .eq("employer_id", auth.userId);

        if ((savedCount || 0) >= 15) {
            return NextResponse.json({
                error: "You've reached the 15 saved candidates limit. We're working on higher plans — want early access?"
            }, { status: 403 });
        }

        const { error } = await supabase
            .from("employer_saved_candidates")
            .insert({
                employer_id: auth.userId,
                seeker_id: id
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
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await validateAuth(["EMPLOYER", "ADMIN"], false, true);
    if (auth.error) return auth.error;

    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    
    try {
        const { error } = await supabase
            .from("employer_saved_candidates")
            .delete()
            .match({ employer_id: auth.userId, seeker_id: id });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to unsave candidate" }, { status: 500 });
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    // Check if a specific candidate is saved
    const auth = await validateAuth(["EMPLOYER", "ADMIN"], false, true);
    if (auth.error) return auth.error;

    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    
    const { data } = await supabase
        .from("employer_saved_candidates")
        .select("id")
        .match({ employer_id: auth.userId, seeker_id: id })
        .maybeSingle();

    return NextResponse.json({ isSaved: !!data });
}
