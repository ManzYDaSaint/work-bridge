import { validateAuth } from "@/lib/auth-guard";
import { NextResponse } from "next/server";
import { createPaymentLink, generateSeekerPlusRef, generateSeekerBadgeRef } from "@/lib/payments";

export async function POST(request: Request) {
    const auth = await validateAuth(['JOB_SEEKER']);
    if (auth.error) return auth.error;

    try {
        const body = await request.json();
        const { type } = body; // 'PLUS' or 'BADGE'

        if (!type || !['PLUS', 'BADGE'].includes(type)) {
            return NextResponse.json({ error: "Invalid upgrade type" }, { status: 400 });
        }

        const email = auth.user?.email || "";
        const customerName = email.split("@")[0] || "Seeker";

        let amount = 0;
        let tx_ref = "";
        let title = "";
        let description = "";

        if (type === 'PLUS') {
            amount = 2500; // MWK 2,500
            tx_ref = generateSeekerPlusRef(auth.userId);
            title = "WorkBridge Pro";
            description = "1 Month Subscription to WorkBridge Pro";
        } else if (type === 'BADGE') {
            amount = 3500; // MWK 3,500
            tx_ref = generateSeekerBadgeRef(auth.userId);
            title = "Featured Candidate Badge";
            description = "One-off purchase for Featured Candidate Badge";
        }

        const paymentRes = await createPaymentLink({
            email,
            amount,
            tx_ref,
            customer_name: customerName,
            title,
            description,
        });

        if (paymentRes.status === "error") {
            return NextResponse.json({ error: paymentRes.message }, { status: 500 });
        }

        return NextResponse.json({ checkoutUrl: paymentRes.data?.link });
    } catch (error: any) {
        console.error("Seeker Checkout API error:", error);
        return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
    }
}
