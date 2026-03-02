export async function createPaymentLink({
    email,
    amount,
    tx_ref,
    customer_name,
}: {
    email: string;
    amount: number;
    tx_ref: string;
    customer_name: string;
}) {
    try {
        const response = await fetch("https://api.flutterwave.com/v3/payments", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                tx_ref,
                amount,
                currency: "MWK", // Malawi Kwacha for Airtel Money / Mpamba
                redirect_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/success`,
                customer: {
                    email,
                    name: customer_name,
                },
                customizations: {
                    title: "WorkBridge Subsription",
                    description: "Payment for WorkBridge Employer Plan",
                    logo: "https://your-logo-url.com",
                },
                // Specifying Mobile Money methods if needed, though Flutterwave handles this automatically based on currency
                payment_options: "mobilemoneycentralafrica,card",
            }),
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Flutterwave error:", error);
        return { status: "error", message: "Failed to create payment link" };
    }
}
