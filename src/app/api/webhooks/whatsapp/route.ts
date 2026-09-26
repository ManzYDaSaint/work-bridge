import { NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

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
        const adminSupabase = getSupabaseAdminClient();

        if (body.object === "whatsapp_business_account") {
            for (const entry of body.entry || []) {
                for (const change of entry?.changes || []) {
                    // Meta always uses field: "messages" for both inbound messages AND delivery statuses.
                    // The discriminator is whether change.value.messages or change.value.statuses is populated.
                    if (change.field === "messages") {

                        // 1. Handle incoming user messages → Live Admin Inbox
                        if (change.value?.messages) {
                            const messages = change.value.messages;
                            const contacts = change.value.contacts || [];

                            for (const msg of messages) {
                                const senderPhone = msg.from;
                                const textBody = msg.text?.body || (msg.type ? `[Media/Interactive: ${msg.type}]` : "");
                                const contactName = contacts.find((c: any) => c.wa_id === senderPhone)?.profile?.name || "Seeker";

                                if (senderPhone && textBody) {
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

                        // 2. Handle delivery/read/failure status updates → update DB record status
                        // Meta sends these under change.value.statuses (same field: "messages")
                        if (change.value?.statuses && adminSupabase) {
                            for (const st of change.value.statuses) {
                                const waMessageId: string = st.id;
                                const statusType: string = (st.status || "").toLowerCase(); // "sent", "delivered", "read", "failed"

                                if (!waMessageId) continue;

                                let dbStatus: "SENT" | "DELIVERED" | "FAILED";
                                if (statusType === "delivered" || statusType === "read") {
                                    dbStatus = "DELIVERED";
                                } else if (statusType === "failed") {
                                    dbStatus = "FAILED";
                                } else {
                                    dbStatus = "SENT";
                                }

                                const errorInfo = st.errors?.[0]
                                    ? { code: st.errors[0].code, title: st.errors[0].title, details: st.errors[0].error_data?.details }
                                    : null;

                                try {
                                    // Look up by metadata->wa_message_id (stored when we sent the broadcast)
                                    const { data: existing } = await adminSupabase
                                        .from("whatsapp_messages")
                                        .select("id, metadata")
                                        .filter("metadata->>wa_message_id", "eq", waMessageId)
                                        .maybeSingle();

                                    if (existing?.id) {
                                        const updatedMeta = {
                                            ...(existing.metadata || {}),
                                            delivery_status: statusType,
                                            ...(errorInfo ? { delivery_error: errorInfo } : {})
                                        };
                                        await adminSupabase
                                            .from("whatsapp_messages")
                                            .update({
                                                status: dbStatus,
                                                metadata: updatedMeta,
                                                updated_at: new Date().toISOString()
                                            })
                                            .eq("id", existing.id);

                                        console.log(`[WhatsApp Webhook] Updated message ${waMessageId} → ${dbStatus}`);
                                    }
                                } catch (updateErr: any) {
                                    console.error("[WhatsApp Webhook] Status update error:", updateErr?.message);
                                }
                            }
                        }
                    }
                }
            }
        }

        // 3. Queue event in automation_tasks for extra background processing (opt-in/opt-out handling etc.)
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

