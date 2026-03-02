import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createPaymentLink } from "@/lib/payments";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Generate a unique reference
        const tx_ref = `tx-${Date.now()}-${user.id.slice(0, 8)}`;

        const payment = await createPaymentLink({
            email: user.email!,
            amount: 5000, // Example: 5000 MWK
            tx_ref,
            customer_name: user.email?.split('@')[0] || "User",
        });

        if (payment.status === "success") {
            return NextResponse.json({ url: payment.data.link });
        } else {
            return NextResponse.json({ error: payment.message || "Failed" }, { status: 400 });
        }
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
