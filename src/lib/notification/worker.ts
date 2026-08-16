import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Worker to process the notification_queue and send via WhatsApp
 */
export async function processNotificationQueue() {
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

async function sendWhatsAppTemplate(to: string, templateId: string, payload: any) {
  // Implementation for calling Meta WhatsApp API
  console.log(`Sending WhatsApp template ${templateId} to ${to} with payload:`, payload);
  
  // Example API call structure:
  // const response = await fetch(`https://graph.facebook.com/...`, { ... });
  // if (!response.ok) throw new Error("WhatsApp API Error");
}
