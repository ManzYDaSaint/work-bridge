// @ts-nocheck
// This is a Deno-based Supabase Edge Function. URL imports (https://esm.sh/...)
// are a valid Deno pattern and are intentionally excluded from the Next.js
// tsconfig.json (see root tsconfig.json "exclude": ["supabase/functions"]).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Declare Deno namespace for IDE TypeScript checkers outside Deno CLI
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/**
 * Verifies Meta WhatsApp x-hub-signature-256 using Web Crypto API.
 */
async function verifySignature(req: Request, rawBody: string): Promise<boolean> {
  const secret = Deno.env.get("WHATSAPP_APP_SECRET");
  const signature = req.headers.get("x-hub-signature-256");

  // If secret is not configured, skip verification safely
  if (!secret) return true;
  if (!signature) return false;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(rawBody)
    );
    const expectedSignature = `sha256=${Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`;

    return signature === expectedSignature;
  } catch {
    return false;
  }
}

// Native Deno.serve HTTP server (standard for Supabase Edge Functions)
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const method = req.method;

  // Handle Meta Webhook Verification (GET)
  if (method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expectedToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN");

    if (mode === "subscribe" && token && token === expectedToken) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // Handle Meta Webhook Events (POST)
  if (method === "POST") {
    try {
      const rawBody = await req.text();

      if (!(await verifySignature(req, rawBody))) {
        return new Response("Invalid signature", { status: 401 });
      }

      const body = JSON.parse(rawBody);

      // 1. Store incoming messages in real-time for Admin Live WhatsApp Inbox
      if (body.object === "whatsapp_business_account") {
        for (const entry of body.entry || []) {
          for (const change of entry?.changes || []) {
            if (change.field === "messages" && change.value?.messages) {
              const messages = change.value.messages;
              const contacts = change.value.contacts || [];

              for (const msg of messages) {
                const senderPhone = msg.from;
                const textBody = msg.text?.body || (msg.type ? `[Media/Interactive: ${msg.type}]` : "");
                const contactName = contacts.find((c: any) => c.wa_id === senderPhone)?.profile?.name || "Seeker";

                if (senderPhone && textBody) {
                  // Seeker profile lookup by phone
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
                    }).catch(() => null);
                  }
                }
              }
            }
          }
        }
      }

      // 2. Queue event in automation_tasks for background processing
      try {
        await supabase.from("automation_tasks").insert({
          plugin_id: "whatsapp-manager",
          payload: { event: body, type: "WHATSAPP_WEBHOOK" },
          status: "PENDING"
        });
      } catch {
        // Ignore queue errors
      }

      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      console.error("WhatsApp edge function error:", err);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
