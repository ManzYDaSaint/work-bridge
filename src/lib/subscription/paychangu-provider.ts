import { IPaymentProvider } from "./subscription-service";

export interface PayChanguCheckoutParams {
    seekerId: string;
    email: string;
    name: string;
    amount: number;
    currency?: string;
    callbackUrl: string;
    returnUrl: string;
}

/**
 * Production-ready PayChangu API Payment Provider Implementation
 * Supports Malawi Kwacha (MWK) payments via Airtel Money, TNM Mpamba, and Cards
 */
export class PayChanguProvider implements IPaymentProvider {
    private secretKey: string;
    private baseUrl: string = "https://api.paychangu.com";

    constructor() {
        this.secretKey = process.env.PAYCHANGU_SECRET_KEY || "";
    }

    async initiatePayment(seekerId: string, amount: number): Promise<{ paymentUrl: string; reference: string; isSimulated?: boolean }> {
        const txRef = `aganyu_prem_${seekerId}_${Date.now()}`;
        const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://aganyu.com";

        if (!this.secretKey) {
            console.warn("[PayChangu] PAYCHANGU_SECRET_KEY missing. Returning simulated checkout URL for dev/testing.");
            return {
                paymentUrl: `${siteUrl}/dashboard/seeker/subscription?reference=${txRef}_simulated&status=simulated`,
                reference: `${txRef}_simulated`,
                isSimulated: true
            };
        }

        try {
            const response = await fetch(`${this.baseUrl}/payment`, {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.secretKey}`
                },
                body: JSON.stringify({
                    amount,
                    currency: "MWK",
                    tx_ref: txRef,
                    callback_url: `${siteUrl}/api/webhooks/paychangu`,
                    return_url: `${siteUrl}/dashboard/seeker/subscription?reference=${txRef}`,
                    customization: {
                        title: "Aganyu Premium Subscription",
                        description: "Instant WhatsApp Job Alerts & AI Matcher"
                    }
                })
            });

            const data = await response.json();
            if (response.ok && data.data?.checkout_url) {
                return {
                    paymentUrl: data.data.checkout_url,
                    reference: txRef,
                    isSimulated: false
                };
            }

            console.error("[PayChangu] API error response:", data);
            throw new Error(data.message || "Failed to generate PayChangu checkout URL");
        } catch (error: any) {
            console.error("[PayChangu] Initiation error:", error);
            throw error;
        }
    }

    async verifyPayment(reference: string): Promise<{ success: boolean; amount: number }> {
        if (!this.secretKey) {
            // Allow simulated testing ONLY if reference explicitly contains 'simulated'
            if (reference.includes("simulated")) {
                console.warn("[PayChangu] Simulating successful payment verification in development.");
                return { success: true, amount: 500 };
            }
            console.warn("[PayChangu] PAYCHANGU_SECRET_KEY missing. Rejecting live payment verification for ref:", reference);
            return { success: false, amount: 0 };
        }

        try {
            const response = await fetch(`${this.baseUrl}/verify-payment/${reference}`, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${this.secretKey}`
                }
            });

            const data = await response.json();
            const isSuccess = response.ok && (data.status === "success" || data.data?.status === "success");

            if (isSuccess) {
                const paidAmount = Number(data.data?.amount || data.amount || 500);
                return {
                    success: true,
                    amount: paidAmount
                };
            }

            console.warn(`[PayChangu] Payment verification returned negative for reference ${reference}:`, data);
            return { success: false, amount: 0 };
        } catch (error) {
            console.error("[PayChangu] Verification error:", error);
            return { success: false, amount: 0 };
        }
    }
}

