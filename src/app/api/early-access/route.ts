import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();
    
    try {
        const body = await request.json();
        const { featureRequested } = body;

        if (!featureRequested) {
            return NextResponse.json({ error: "Feature requested is required" }, { status: 400 });
        }

        // Fetch user email
        const { data: user } = await supabase
            .from("users")
            .select("email, role")
            .eq("id", auth.userId)
            .single();

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Check if already requested for this feature to prevent duplicates
        const { data: existing } = await supabase
            .from("early_access_leads")
            .select("id")
            .eq("user_id", auth.userId)
            .eq("feature_requested", featureRequested)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ success: true, message: "Already on the waitlist for this feature" });
        }

        // Insert new lead
        const { error: insertError } = await supabase
            .from("early_access_leads")
            .insert({
                user_id: auth.userId,
                email: user.email,
                role: user.role,
                feature_requested: featureRequested
            });

        if (insertError) throw insertError;

        return NextResponse.json({ success: true, message: "Successfully joined early access waitlist!" });
    } catch (error: any) {
        console.error("Early access POST error:", error);
        return NextResponse.json({ error: error.message || "Failed to submit request" }, { status: 500 });
    }
}
