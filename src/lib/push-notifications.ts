import webpush from "web-push";
import { getSupabaseAdminClient } from "./supabase-admin";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:hello@aganyu.co";

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export interface PushPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    url?: string;
    tag?: string;
}

/**
 * Send a push notification to a single user (all their subscribed devices).
 * Silently removes stale/expired subscriptions (410 Gone responses).
 */
export async function sendPushNotification(userId: string, payload: PushPayload) {
    if (!vapidPublicKey || !vapidPrivateKey) {
        console.warn("[PUSH] VAPID keys not configured — skipping push notification.");
        return;
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) return;

    // Fetch all subscriptions for this user
    const { data: subscriptions, error } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", userId);

    if (error || !subscriptions?.length) return;

    const notification = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || "/icons/icon-192.png",
        badge: payload.badge || "/icons/icon-192.png",
        url: payload.url || "/",
        tag: payload.tag || "aganyu-notification",
        data: { url: payload.url || "/" },
    });

    const staleIds: string[] = [];

    await Promise.allSettled(
        subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                    notification
                );
            } catch (err: any) {
                // 410 Gone = subscription expired/unsubscribed — clean it up
                if (err.statusCode === 410 || err.statusCode === 404) {
                    staleIds.push(sub.id);
                } else {
                    console.error(`[PUSH] Failed to send to endpoint ${sub.endpoint}:`, err.message);
                }
            }
        })
    );

    // Remove stale subscriptions
    if (staleIds.length > 0) {
        await supabase.from("push_subscriptions").delete().in("id", staleIds);
    }
}
