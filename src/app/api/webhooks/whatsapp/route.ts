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

        // 1. Process incoming user messages in real-time for Live Admin Inbox
        if (body.object === "whatsapp_business_account") {
            for (const entry of body.entry || []) {
                for (const change of entry?.changes || []) {
                    if (change.field === "messages" && change.value?.messages) {
                        const messages = change.value.messages;
                        const contacts = change.value.contacts || [];
                        
                        for (const msg of messages) {
                            const senderPhone = msg.from; // e.g. "265999123456"
                            const textBody = msg.text?.body || (msg.type ? `[Media/Interactive: ${msg.type}]` : "");
                            const contactName = contacts.find((c: any) => c.wa_id === senderPhone)?.profile?.name || "Seeker";

                            if (senderPhone && textBody) {
                                // Lookup seeker by phone number
                                const { data: seeker } = await supabase
                                    .from("job_seekers")
                                    .select("id, user_id, full_name, phone")
                                    .or(`phone.eq.${senderPhone},phone.eq.+${senderPhone}`)
                                    .maybeSingle();

                                try {
                                    await supabase.from("whatsapp_messages").insert({
                                        user_id: seeker?.user_id || null,
                                        phone: senderPhone,
                                        direction: "INBOUND",
                                        message_text: textBody,
                                        status: "RECEIVED",
                                        metadata: {
                                            contact_name: contactName,
                                            wa_message_id: msg.id,
                                            timestamp: msg.timestamp,
                                            seeker_id: seeker?.id || null
                                        },
                                        created_at: new Date().toISOString()
                                    });
                                } catch {
                                    // Fallback to whatsapp_delivery_logs
                                    await supabase.from("whatsapp_delivery_logs").insert({
                                        user_id: seeker?.user_id || null,
                                        status: "RECEIVED",
                                        error: `INBOUND: ${textBody}`,
                                        metadata: { phone: senderPhone, text: textBody, contactName }
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }

        // 2. Queue event in automation_tasks for extra background processing
        try {
            await supabase.from("automation_tasks").insert({
                plugin_id: "whatsapp-manager",
                payload: { event: body, type: "WHATSAPP_WEBHOOK" },
                status: "PENDING"
            });
        } catch {
            // Ignore queue error if task table is busy
        }

        return NextResponse.json({ status: "ok" }, { status: 200 });
    } catch (error: any) {
        console.error("WhatsApp webhook error:", error);
        return new Response("Internal Error", { status: 500 });
    }
}

