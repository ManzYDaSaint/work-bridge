import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { buildMeProfile } from "@/lib/me-profile";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();
    const { profile, error } = await buildMeProfile(supabase, auth.userId);

    if (error === "not_found" || !profile) {
        return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const response = NextResponse.json(profile);
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
}
