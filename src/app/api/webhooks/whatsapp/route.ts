import { NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === "subscribe" && token && token === expectedToken) {
        return new Response(challenge, { status: 200 });
    }

    return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
    try {
        const rawBody = await request.text();
        const signature = request.headers.get("x-hub-signature-256");

        const appSecret = process.env.WHATSAPP_APP_SECRET;

        // Verify signature if APP_SECRET is configured
        if (appSecret && signature) {
            const hmac = crypto.createHmac("sha256", appSecret);
            hmac.update(rawBody);
            const expectedSignature = `sha256=${hmac.digest("hex")}`;

            if (signature !== expectedSignature) {
                return new Response("Invalid signature", { status: 401 });
            }
        }

        const body = JSON.parse(rawBody);
        const supabase = await createSupabaseServerClient();

        // Queue event in automation_tasks for processing
        await supabase.from("automation_tasks").insert({
            plugin_id: "whatsapp-manager",
            payload: { event: body, type: "WHATSAPP_WEBHOOK" },
            status: "PENDING"
        });

        return NextResponse.json({ status: "ok" }, { status: 200 });
    } catch (error: any) {
        console.error("WhatsApp webhook error:", error);
        return new Response("Internal Error", { status: 500 });
    }
}
