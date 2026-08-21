import { getSupabaseAdminClient } from "@/lib/supabase-admin";

/**
 * Worker to process the notification_queue and send via WhatsApp
 */
export async function processNotificationQueue() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error("[WhatsApp Worker] Admin Supabase client not initialized.");
    return;
  }
  // 1. Fetch pending notifications
  const { data: queueItems } = await supabase
    .from("notification_queue")
    .select("*, job_seekers(phone)")
    .eq("status", "PENDING")
    .limit(10);

  if (!queueItems) return;

  for (const item of queueItems) {
    try {
      // 2. Send via WhatsApp API
      await sendWhatsAppTemplate(
        item.job_seekers.phone,
        item.template_id,
        item.payload
      );

      // 3. Mark as sent
      await supabase
        .from("notification_queue")
        .update({ status: "SENT" })
        .eq("id", item.id);

      // 4. Log delivery
      await supabase.from("whatsapp_delivery_logs").insert({
        queue_id: item.id,
        status: "SUCCESS"
      });

    } catch (error: any) {
      console.error(`Failed to send notification ${item.id}:`, error);
      await supabase
        .from("notification_queue")
        .update({ status: "FAILED", last_error: error.message, attempts: item.attempts + 1 })
        .eq("id", item.id);
    }
  }
}

export async function sendWhatsAppTemplate(to: string, templateId: string, payload: any) {
  const token = process.env.WHATSAPP_API_TOKEN && !process.env.WHATSAPP_API_TOKEN.includes("your_meta")
    ? process.env.WHATSAPP_API_TOKEN
    : process.env.PERMANENT_TOKEN || process.env.ACCESS_TOKEN;

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token) {
    throw new Error("Missing Meta WhatsApp Access Token (WHATSAPP_API_TOKEN, PERMANENT_TOKEN, or ACCESS_TOKEN)");
  }
  if (!phoneNumberId) {
    throw new Error("Missing WHATSAPP_PHONE_NUMBER_ID in environment variables");
  }

  // Format recipient phone number (remove +, spaces, hyphens)
  const formattedTo = to ? to.replace(/[^\d]/g, "") : "";
  if (!formattedTo) {
    throw new Error("Invalid or empty destination phone number");
  }

  const apiVersion = process.env.WHATSAPP_API_VERSION || "v20.0";
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  // Build template components based on payload structure
  let components: any[] = [];
  if (payload?.components && Array.isArray(payload.components)) {
    components = payload.components;
  } else if (payload?.parameters && Array.isArray(payload.parameters)) {
    components = [{ type: "body", parameters: payload.parameters }];
  } else if (payload) {
    const params: Array<{ type: string; text: string }> = [];

    if (templateId === "aganyu_job_match_alert_v1") {
      // Template param order: {{1}}=seekerName, {{2}}=jobTitle, {{3}}=company, {{4}}=matchScore, {{5}}=location
      params.push({ type: "text", text: String(payload.seekerName || "Seeker") });
      params.push({ type: "text", text: String(payload.jobTitle || "Job Opportunity") });
      params.push({ type: "text", text: String(payload.company || "Employer") });
      params.push({ type: "text", text: `${String(payload.matchScore || 0)}` });
      params.push({ type: "text", text: String(payload.location || "Malawi") });

      components.push({
        type: "body",
        parameters: params
      });

      // Button: dynamic URL suffix (job ID only, base URL is fixed in template)
      const buttonParam = payload.jobId || (payload.jobUrl ? payload.jobUrl.split("/").pop() : "");
      if (buttonParam) {
        components.push({
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: String(buttonParam) }]
        });
      }
    } else {
      // Legacy or custom template fallback
      if (payload.jobTitle) params.push({ type: "text", text: String(payload.jobTitle) });
      if (payload.company) params.push({ type: "text", text: String(payload.company) });
      if (payload.matchScore) params.push({ type: "text", text: `${payload.matchScore}%` });

      if (params.length > 0) {
        components.push({
          type: "body",
          parameters: params
        });
      }
    }
  }

  const body = {
    messaging_product: "whatsapp",
    to: formattedTo,
    type: "template",
    template: {
      name: templateId,
      language: {
        code: payload?.languageCode || "en"
      },
      ...(components.length > 0 ? { components } : {})
    }
  };

  console.log(`[WhatsApp Worker] Dispatching template '${templateId}' to ${formattedTo}...`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const responseData = await response.json();

  if (!response.ok) {
    const errorMsg = responseData?.error?.message || response.statusText;
    console.error("[WhatsApp Worker] Meta API error details:", responseData);
    throw new Error(`WhatsApp API Error (${response.status}): ${errorMsg}`);
  }

  console.log(`[WhatsApp Worker] Successfully dispatched message ID: ${responseData?.messages?.[0]?.id}`);
  return responseData;
}
