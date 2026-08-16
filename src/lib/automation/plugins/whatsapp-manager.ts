import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * WhatsApp Manager Plugin
 * Processes queued webhook events from automation_tasks
 */
export async function processWhatsAppEvent(taskId: string, payload: any) {
  try {
    const { event } = payload;
    
    // 1. Handle Message Status Updates (e.g., delivered, read)
    if (event.object === "whatsapp_business_account") {
      for (const entry of event.entry) {
        for (const change of entry.changes) {
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

  } catch (error) {
    console.error("Error processing WhatsApp event:", error);
    await supabase
      .from("automation_tasks")
      .update({ status: "FAILED", last_error: (error as Error).message })
      .eq("id", taskId);
  }
}

async function handleMessages(value: any) {
  // Logic to process incoming user messages (e.g., "START", "STOP")
  console.log("Processing incoming message:", value);
}

async function handleStatuses(value: any) {
  // Logic to process delivery/read status updates
  console.log("Processing status update:", value);
}
