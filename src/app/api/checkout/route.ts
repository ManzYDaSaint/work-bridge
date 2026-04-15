import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createPaymentLink, generateEmployerPremiumRef } from "@/lib/payments";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Generate a semantic reference
        const tx_ref = generateEmployerPremiumRef(user.id);

        const payment = await createPaymentLink({
            email: user.email!,
            amount: 15000, // Premium Employer Plan Amount
            tx_ref,
            customer_name: user.email?.split('@')[0] || "User",
            title: "WorkBridge Premium Employer",
            description: "30-day Premium Employer plan with unlimited role listings.",
        });

        if (payment.status === "success" && payment.data?.link) {
            return NextResponse.json({ url: payment.data.link });
        } else {
            return NextResponse.json({ error: payment.message || "Failed" }, { status: 400 });
        }
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
