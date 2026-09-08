import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        const supabase = await createSupabaseServerClient();

        const { error } = await supabase.auth.signOut();

        const response = NextResponse.json({ success: true });

        if (error) {
            console.error("Server-side logout failed:", error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        response.cookies.set("last-active", "", {
            path: "/",
            expires: new Date(0),
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
        });

        response.cookies.set("wb_onboarding_done", "", {
            path: "/",
            expires: new Date(0),
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
        });

        response.cookies.set("wb_exp_onboarding", "", {
            path: "/",
            expires: new Date(0),
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
        });

        return response;
    } catch (error) {
        console.error("Logout route exception:", error);
        return NextResponse.json({ success: false, error: "Logout failed" }, { status: 500 });
    }
}
