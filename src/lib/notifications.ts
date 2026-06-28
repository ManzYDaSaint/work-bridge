import { getSupabaseAdminClient } from "./supabase-admin";
import { sendPushNotification } from "./push-notifications";

export type NotificationType = 
  | "APPLICATION_UPDATE" 
  | "NEW_APPLICATION" 
  | "SYSTEM" 
  | "VERIFICATION_UPDATE" 
  | "PAYMENT_SUCCESS"
  | "REFERRAL_BONUS"
  | "WARNING"
  | "PROFILE_VIEW";

export async function createNotification({
  userId,
  title,
  message,
  type,
  link,
}: {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
}) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error("[NOTIFICATION_DEBUG] FAILED: Admin client could not be initialized.");
    return null;
  }

  if (!userId) {
    console.error("[NOTIFICATION_DEBUG] FAILED: Attempted to create notification with empty userId.");
    return null;
  }

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: userId,
      title,
      message,
      type,
      link,
      is_read: false,
    })
    .select()
    .single();

  if (error) {
    console.error(`[NOTIFICATION_DEBUG] DATABASE_ERROR [${error.code}]: ${error.message}`);
    console.error("[NOTIFICATION_DEBUG] STACK_TRACE:", new Error().stack);
    return null;
  }

  console.log(`[NOTIFICATION_DEBUG] SUCCESS: Notification created for user ${userId}`);

  // Fire a Web Push notification to all the user's subscribed devices
  // This runs fire-and-forget — don't await so we don't block the response
  sendPushNotification(userId, {
    title,
    body: message,
    url: link,
    tag: type,
  }).catch((err) => console.warn("[PUSH] Non-critical push failure:", err));

  return data;
}

export async function notifyAdmin({
  title,
  message,
  type,
  link,
}: {
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
}) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error("[NOTIFICATION_DEBUG] Admin notification FAILED: Client not initialized.");
    return null;
  }

  // Find users with admin role
  const { data: admins } = await supabase
    .from("users")
    .select("id")
    .eq("role", "ADMIN");

  if (!admins || admins.length === 0) return null;

  // Create notifications for all admins
  const notifications = admins.map(admin => ({
    user_id: admin.id,
    title,
    message,
    type,
    link,
    is_read: false,
  }));

  const { data, error } = await supabase
    .from("notifications")
    .insert(notifications)
    .select();

  if (error) {
    console.error("Error notifying admins:", error);
    return null;
  }

  return data;
}
