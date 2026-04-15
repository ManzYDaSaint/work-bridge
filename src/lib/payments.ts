// Payment Intent Prefix Generators
export const generateEmployerPremiumRef = (userId: string) => `wb-emp-premium-${userId}-${Date.now()}`;
export const generateSeekerPlusRef = (userId: string) => `wb-plus-${userId}-${Date.now()}`;
export const generateSeekerBadgeRef = (userId: string) => `wb-badge-${userId}-${Date.now()}`;

export async function createPaymentLink({
    email,
    amount,
    tx_ref,
    customer_name,
    title = "WorkBridge Subscription",
    description = "Payment for WorkBridge",
}: {
    email: string;
    amount: number;
    tx_ref: string;
    customer_name: string;
    title?: string;
    description?: string;
}) {
    try {
        const payload = {
            amount,
            currency: "MWK",
            tx_ref,
            email,
            first_name: customer_name.split(" ")[0] || customer_name,
            last_name: customer_name.split(" ").slice(1).join(" ") || "User",
            callback_url: `${process.env.NEXT_PUBLIC_URL}/api/webhooks/paychangu`,
            return_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/success?tx_ref=${tx_ref}`,
            customization: {
                title,
                description,
            }
        };

        const response = await fetch("https://api.paychangu.com/payment", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        
        if (data.status === "success" && data.data?.checkout_url) {
            return { status: "success", data: { link: data.data.checkout_url } };
        } else {
            console.error("PayChangu init error:", data);
            return { status: "error", message: data.message || "Failed to create payment link" };
        }
    } catch (error) {
        console.error("PayChangu API error:", error);
        return { status: "error", message: "Failed to create payment link" };
    }
}
