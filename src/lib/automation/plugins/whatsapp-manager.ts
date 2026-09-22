import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { registerPlugin } from "../registry";

/**
 * WhatsApp Manager Plugin
 * Processes queued webhook events from automation_tasks asynchronously
 */
export async function processWhatsAppEvent(taskId: string, payload: any) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  try {
    const { event } = payload;

    if (event?.object === "whatsapp_business_account") {
      for (const entry of event.entry || []) {
        for (const change of entry?.changes || []) {
          if (change.field === "messages") {
            await handleMessages(change.value);
          } else if (change.field === "statuses") {
            await handleStatuses(change.value);
          }
        }
      }
    }

    // Mark task as completed
    await supabase
      .from("automation_tasks")
      .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
      .eq("id", taskId);

  } catch (error: any) {
    console.error("Error processing WhatsApp event in whatsapp-manager:", error);
    await supabase
      .from("automation_tasks")
      .update({ status: "FAILED", last_error: error?.message || String(error) })
      .eq("id", taskId);
  }
}

/**
 * Handle incoming user messages & opt-in/opt-out keywords ("STOP", "START", "UNSUBSCRIBE")
 */
async function handleMessages(value: any) {
  const supabase = getSupabaseAdminClient();
  if (!supabase || !value?.messages) return;

  const messages = value.messages || [];
  const contacts = value.contacts || [];

  for (const msg of messages) {
    const senderPhone = msg.from; // e.g. "265999123456"
    const textBody = (msg.text?.body || "").trim();
    const contactName = contacts.find((c: any) => c.wa_id === senderPhone)?.profile?.name || "Seeker";

    if (!senderPhone) continue;

    // Lookup seeker by phone number
    const { data: seeker } = await supabase
      .from("job_seekers")
      .select("id, user_id, full_name, phone")
      .or(`phone.eq.${senderPhone},phone.eq.+${senderPhone}`)
      .maybeSingle();

    const textUpper = textBody.toUpperCase();

    // 1. Handle Opt-Out Commands ("STOP", "UNSUBSCRIBE", "CANCEL", "OFF")
    if (["STOP", "UNSUBSCRIBE", "CANCEL", "OFF"].includes(textUpper)) {
      if (seeker?.id) {
        await supabase
          .from("notification_preferences")
          .upsert({ seeker_id: seeker.id, whatsapp_enabled: false }, { onConflict: "seeker_id" });
        console.log(`[WhatsApp Manager] Opted out seeker ${seeker.id} (${senderPhone}) from WhatsApp notifications.`);
      }
    }

    // 2. Handle Opt-In Commands ("START", "SUBSCRIBE", "ON")
    if (["START", "SUBSCRIBE", "ON"].includes(textUpper)) {
      if (seeker?.id) {
        await supabase
          .from("notification_preferences")
          .upsert({ seeker_id: seeker.id, whatsapp_enabled: true }, { onConflict: "seeker_id" });
        console.log(`[WhatsApp Manager] Opted in seeker ${seeker.id} (${senderPhone}) to WhatsApp notifications.`);
      }
    }

    // 3. Persist incoming message to DB
    try {
      await supabase.from("whatsapp_messages").insert({
        user_id: seeker?.user_id || null,
        phone: senderPhone,
        direction: "INBOUND",
        message_text: textBody || `[Media/Interactive: ${msg.type || "unknown"}]`,
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
      // Fallback log
      try {
        await supabase.from("whatsapp_delivery_logs").insert({
          user_id: seeker?.user_id || null,
          status: "RECEIVED",
          error: `INBOUND: ${textBody}`,
          metadata: { phone: senderPhone, text: textBody, contactName }
        });
      } catch {
        // Ignore fallback error
      }
    }
  }
}

/**
 * Handle delivery & read status updates ("sent", "delivered", "read", "failed")
 */
async function handleStatuses(value: any) {
  const supabase = getSupabaseAdminClient();
  if (!supabase || !value?.statuses) return;

  const statuses = value.statuses || [];

  for (const st of statuses) {
    const waMessageId = st.id;
    const recipientPhone = st.recipient_id;
    const statusType = (st.status || "").toUpperCase(); // "SENT", "DELIVERED", "READ", "FAILED"

    if (!waMessageId && !recipientPhone) continue;

    const dbStatus = statusType === "READ" ? "DELIVERED" : (statusType === "FAILED" ? "FAILED" : "DELIVERED");

    // Update matching outbound message status in DB
    try {
      if (waMessageId) {
        await supabase
          .from("whatsapp_messages")
          .update({ status: dbStatus, updated_at: new Date().toISOString() })
          .filter("metadata->>wa_message_id", "eq", waMessageId);
      }
    } catch {
      // Ignore update error
    }

    console.log(`[WhatsApp Manager] Message ${waMessageId} to ${recipientPhone} status updated to: ${statusType}`);
  }
}

// Register whatsapp-manager in the automation plugin registry
registerPlugin({
  id: "whatsapp-manager",
  run: async (payload: any) => {
    await processWhatsAppEvent(payload.taskId, payload);
  }
});
