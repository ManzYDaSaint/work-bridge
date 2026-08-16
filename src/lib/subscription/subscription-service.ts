/**
 * Payment Provider Interface
 * Ensures provider-independence for Aganyu Premium
 */
export interface IPaymentProvider {
    initiatePayment(seekerId: string, amount: number): Promise<{ paymentUrl: string; reference: string }>;
    verifyPayment(reference: string): Promise<{ success: boolean; amount: number }>;
}

/**
 * Subscription Service
 * Manages subscription lifecycle: Trial -> Active -> Expired
 */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class SubscriptionService {
    
    // Start 7-day free trial
    static async startTrial(seekerId: string) {
        const endsAt = new Date();
        endsAt.setDate(endsAt.getDate() + 7);

        await supabase.from("subscription_trials").insert({
            seeker_id: seekerId,
            ends_at: endsAt.toISOString()
        });

        // Emit Automation Event
        await supabase.from("automation_tasks").insert({
            plugin_id: "crm-manager",
            payload: { seekerId, event: "PREMIUM_TRIAL_STARTED" }
        });
    }

    // Upgrade to Premium
    static async activateSubscription(seekerId: string, provider: string, reference: string) {
        const endsAt = new Date();
        endsAt.setMonth(endsAt.getMonth() + 1); // 1 month subscription

        await supabase.from("premium_subscriptions").upsert({
            seeker_id: seekerId,
            status: "ACTIVE",
            ends_at: endsAt.toISOString(),
            payment_provider: provider,
            payment_reference: reference
        });

        // Emit Automation Event
        await supabase.from("automation_tasks").insert({
            plugin_id: "crm-manager",
            payload: { seekerId, event: "PREMIUM_SUBSCRIBED" }
        });
    }
}
