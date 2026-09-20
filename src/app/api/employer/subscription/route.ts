import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { PayChanguProvider } from "@/lib/subscription/paychangu-provider";

export async function POST(request: Request) {
    const auth = await validateAuth(['EMPLOYER', 'ADMIN'], false);
    if (auth.error || !auth.user) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const body = await request.json();
        const { action, period = 'MONTHLY', amount } = body;

        if (action === "INITIATE_CHECKOUT") {
            const daysToAdd = period === "QUARTERLY" ? 90 : 30;
            const expiresAt = new Date(Date.now() + daysToAdd * 24 * 3600 * 1000).toISOString();

            const provider = new PayChanguProvider();
            const checkout = await provider.initiatePayment(auth.user.id, amount || 25000, {
                txPrefix: `aganyu_emp_pro_${period}_`,
                returnUrlPath: "/dashboard/employer/billing",
                title: "Aganyu Employer Pro Plan",
                description: "Unlimited talent pools, candidate scorecards & direct outreach"
            });

            // If simulated payment (dev mode / missing API key), automatically activate PRO plan for dev testing
            if (checkout.isSimulated) {
                await supabase
                    .from("employers")
                    .update({ 
                        plan: "PRO",
                        plan_expires_at: expiresAt 
                    })
                    .eq("id", auth.user.id);
            }

            return NextResponse.json({
                success: true,
                paymentUrl: checkout.paymentUrl,
                reference: checkout.reference,
                isSimulated: checkout.isSimulated || false,
                amount: amount || 25000
            });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error: any) {
        console.error("Employer subscription error:", error);
        return NextResponse.json({ error: error.message || "Operation failed" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
