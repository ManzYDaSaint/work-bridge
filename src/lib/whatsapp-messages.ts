import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v20.0";

export interface WhatsAppMessagePayload {
    to: string;
    text?: string;
    templateId?: string;
    templateParams?: any;
}

/**
 * Sends a Meta WhatsApp Cloud API message (freeform text or template).
 */
export async function sendMetaWhatsAppMessage(payload: WhatsAppMessagePayload) {
    const token = process.env.WHATSAPP_API_TOKEN && !process.env.WHATSAPP_API_TOKEN.includes("your_meta")
        ? process.env.WHATSAPP_API_TOKEN
        : process.env.PERMANENT_TOKEN || process.env.ACCESS_TOKEN;

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token) {
        throw new Error("Meta WhatsApp API Access Token is missing (WHATSAPP_API_TOKEN).");
    }
    if (!phoneNumberId) {
        throw new Error("Meta WhatsApp Phone Number ID is missing (WHATSAPP_PHONE_NUMBER_ID).");
    }

    const formattedTo = payload.to.replace(/[^\d]/g, "");
    if (!formattedTo || formattedTo.length < 7) {
        throw new Error(`Invalid destination phone number: "${payload.to}"`);
    }

    const url = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`;

    let requestBody: any;

    if (payload.templateId) {
        requestBody = {
            messaging_product: "whatsapp",
            to: formattedTo,
            type: "template",
            template: {
                name: payload.templateId,
                language: { code: payload.templateParams?.languageCode || "en" },
                ...(payload.templateParams?.components ? { components: payload.templateParams.components } : {})
            }
        };
    } else {
        requestBody = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedTo,
            type: "text",
            text: {
                preview_url: true,
                body: payload.text || ""
            }
        };
    }

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
    });

    const responseData = await response.json();

    if (!response.ok) {
        const errorMsg = responseData?.error?.message || response.statusText;
        throw new Error(`WhatsApp API Error (${response.status}): ${errorMsg}`);
    }

    return responseData;
}

/**
 * Log outbound/inbound WhatsApp messages in DB table or automation logs safely.
 */
export async function logWhatsAppMessage(data: {
    user_id?: string | null;
    phone: string;
    direction: "OUTBOUND" | "INBOUND";
    message_text: string;
    status: "DELIVERED" | "SENT" | "FAILED" | "RECEIVED";
    metadata?: any;
}) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return;

    try {
        await supabase.from("whatsapp_messages").insert({
            user_id: data.user_id || null,
            phone: data.phone,
            direction: data.direction,
            message_text: data.message_text,
            status: data.status,
            metadata: data.metadata || {},
            created_at: new Date().toISOString()
        });
    } catch {
        // Fallback to whatsapp_delivery_logs if whatsapp_messages table doesn't exist
        try {
            await supabase.from("whatsapp_delivery_logs").insert({
                user_id: data.user_id || null,
                status: data.status,
                error: data.direction === "INBOUND" ? `INBOUND: ${data.message_text}` : null,
                metadata: { phone: data.phone, text: data.message_text, direction: data.direction }
            });
        } catch {
            // Ignore log persistence error silently
        }
    }
}
