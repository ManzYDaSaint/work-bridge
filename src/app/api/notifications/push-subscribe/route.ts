import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// GET: Return the VAPID public key so the client can subscribe
export async function GET() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
        return NextResponse.json({ error: "Push notifications not configured" }, { status: 503 });
    }
    return NextResponse.json({ publicKey });
}

// POST: Save a new push subscription for the authenticated user
export async function POST(request: Request) {
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const { endpoint, keys } = await request.json();

        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return NextResponse.json({ error: "Invalid subscription object" }, { status: 400 });
        }

        // Upsert — if this device already subscribed, update it
        const { error } = await supabase
            .from("push_subscriptions")
            .upsert(
                {
                    user_id: auth.userId,
                    endpoint,
                    p256dh: keys.p256dh,
                    auth: keys.auth,
                },
                { onConflict: "user_id,endpoint" }
            );

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[PUSH_SUBSCRIBE] Error:", error);
        return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
    }
}

// DELETE: Remove a push subscription (user opted out)
export async function DELETE(request: Request) {
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const { endpoint } = await request.json();

        if (!endpoint) {
            return NextResponse.json({ error: "Endpoint required" }, { status: 400 });
        }

        const { error } = await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", auth.userId)
            .eq("endpoint", endpoint);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[PUSH_UNSUBSCRIBE] Error:", error);
        return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 });
    }
}
