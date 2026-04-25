import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();
    
    try {
        const { error } = await supabase
            .from("certificates")
            .delete()
            .match({ id: params.id, seeker_id: auth.userId });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to delete certificate" }, { status: 500 });
    }
}
