import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v20.0";

export interface WhatsAppMessagePayload {
    to: string;
    text?: string;
    templateId?: string;
    templateParams?: any;
    components?: any[];
}

/**
 * Normalizes phone numbers to WhatsApp-compatible E.164 digits without "+".
 * Specifically handles Malawi numbers (+265), national formats (088..., 099...), and international numbers.
 */
export function normalizeWhatsAppPhone(phone?: string | null): string | null {
    if (!phone) return null;
    
    // Strip non-digits and leading plus
    let clean = phone.replace(/[^\d]/g, "").trim();
    if (!clean) return null;

    // Handle leading zeros (e.g., 00265... or 0888...)
    if (clean.startsWith("00")) {
        clean = clean.slice(2);
    }

    // Malawi specific normalization:
    // Case 1: 10 digits starting with 0 (e.g. 0888123456, 0994013471, 098..., 089...)
    if (clean.length === 10 && clean.startsWith("0")) {
        return `265${clean.slice(1)}`;
    }

    // Case 2: 9 digits starting with 8 or 9 (e.g. 888123456, 994013471)
    if (clean.length === 9 && (clean.startsWith("8") || clean.startsWith("9"))) {
        return `265${clean}`;
    }

    // Case 3: Already starting with 265 and having 12 digits (standard full Malawi number)
    if (clean.startsWith("265") && clean.length === 12) {
        return clean;
    }

    // Case 4: International numbers with standard E.164 length (between 8 and 15 digits)
    if (clean.length >= 8 && clean.length <= 15) {
        return clean;
    }

    return null;
}

/**
 * Cleans text intended for Meta WhatsApp template parameters.
 * Meta Error 132018 forbids newline (\n, \r), tab characters, or >4 consecutive spaces in parameter values.
 */
export function cleanMetaParamText(text?: string | null, maxLength = 1000): string {
    if (!text) return "";
    return text
        .replace(/(\r\n|\n|\r)+/g, (match, offset, str) => {
            const prevChar = str[offset - 1];
            if (prevChar && !/[.!?:;,—–-]/.test(prevChar)) {
                return ". ";
            }
            return " ";
        })
        .replace(/\t/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim()
        .slice(0, maxLength);
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

    const formattedTo = normalizeWhatsAppPhone(payload.to);
    if (!formattedTo) {
        throw new Error(`Invalid or unparseable destination phone number: "${payload.to}"`);
    }

    const url = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`;

    let requestBody: any;

    if (payload.templateId) {
        const components = payload.components || payload.templateParams?.components;
        requestBody = {
            messaging_product: "whatsapp",
            to: formattedTo,
            type: "template",
            template: {
                name: payload.templateId,
                language: { code: payload.templateParams?.languageCode || "en" },
                ...(components && components.length > 0 ? { components } : {})
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
        const errorCode = responseData?.error?.code;
        const errorDetails = responseData?.error?.error_data?.details;
        const fullMessage = errorDetails ? `${errorMsg} (${errorDetails})` : errorMsg;
        const err: any = new Error(`WhatsApp API Error (${response.status}): ${fullMessage}`);
        err.status = response.status;
        err.code = errorCode;
        err.details = errorDetails;
        throw err;
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
    if (!supabase) return null;

    const normalizedPhone = normalizeWhatsAppPhone(data.phone) || data.phone;

    try {
        const { data: inserted, error } = await supabase.from("whatsapp_messages").insert({
            user_id: data.user_id || null,
            phone: normalizedPhone,
            direction: data.direction,
            message_text: data.message_text,
            status: data.status,
            metadata: data.metadata || {},
            created_at: new Date().toISOString()
        }).select().maybeSingle();

        if (!error && inserted) return inserted;
    } catch {
        // Fallback to whatsapp_delivery_logs if whatsapp_messages table doesn't exist
        try {
            await supabase.from("whatsapp_delivery_logs").insert({
                user_id: data.user_id || null,
                status: data.status,
                error: data.direction === "INBOUND" ? `INBOUND: ${data.message_text}` : null,
                metadata: { phone: normalizedPhone, text: data.message_text, direction: data.direction, ...(data.metadata || {}) }
            });
        } catch {
            // Ignore log persistence error silently
        }
    }

    return null;
}

