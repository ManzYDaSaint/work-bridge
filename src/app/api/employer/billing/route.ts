import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { sendPaymentConfirmationEmail } from "@/lib/resend";

export async function POST(request: Request) {
    const auth = await validateAuth();
    if (auth.error) return auth.error;

    if (auth.role !== "EMPLOYER") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { transaction_id, tx_ref } = body;

        if (!tx_ref) {
            return NextResponse.json({ error: "Transaction Reference (tx_ref) required" }, { status: 400 });
        }

        // Verify transaction with PayChangu
        const pcResponse = await fetch(`https://api.paychangu.com/verify-payment/${tx_ref}`, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`
            }
        });

        const pcData = await pcResponse.json();

        if (pcData.status !== "success" || pcData.data.status !== "success" || pcData.data.amount < 15000) {
            return NextResponse.json({ error: "Invalid transaction" }, { status: 400 });
        }

        const supabase = await createSupabaseServerClient();

        // Check if tx_ref already exists (e.g. processed by webhook)
        const { data: existingTx } = await supabase.from("transactions").select("id").eq("tx_ref", tx_ref).single();
        if (existingTx) {
            return NextResponse.json({ message: "Transaction already processed successfully" });
        }

        // Record transaction
        const { error: txError } = await supabase.from("transactions").insert({
            user_id: auth.userId,
            amount: pcData.data.amount,
            currency: pcData.data.currency,
            status: 'SUCCESS',
            tx_ref: pcData.data.tx_ref,
            payment_method: "PAYCHANGU"
        });

        if (txError) {
            console.error("Transaction record error:", txError);
            return NextResponse.json({ error: "Failed to record transaction. Please contact support." }, { status: 500 });
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const { error: empError } = await supabase
            .from("employers")
            .update({ plan: 'PREMIUM', plan_expires_at: expiresAt.toISOString() })
            .eq("id", auth.userId);

        if (empError) {
            return NextResponse.json({ error: empError.message }, { status: 500 });
        }

        // Also record the subscription to the ledger
        const { error: subError } = await supabase.from("subscriptions").insert({
            user_id: auth.userId,
            plan: 'PREMIUM',
            status: 'ACTIVE',
            end_date: expiresAt.toISOString(),
        });

        if (subError) {
            console.error("Subscription row creation failed:", subError);
            // Non-fatal, employer row was updated, but log it
        }

        const { data: userRecord } = await supabase
            .from("users")
            .select("email")
            .eq("id", auth.userId)
            .single();

        if (userRecord?.email) {
            await sendPaymentConfirmationEmail(userRecord.email, {
                name: auth.user?.email?.split("@")[0],
                amount: pcData.data.amount,
                currency: pcData.data.currency,
                reference: pcData.data.tx_ref,
                description: "Your employer premium plan is now active for 30 days.",
                dashboardPath: "/dashboard/employer",
            });
        }

        return NextResponse.json({ message: "Successfully upgraded to PREMIUM plan" });
    } catch (error: any) {
        console.error("Billing verification error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function GET() {
    const auth = await validateAuth(['EMPLOYER']);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const [employerRes, transactionsRes] = await Promise.all([
            supabase.from("employers").select("plan, plan_expires_at").eq("id", auth.userId).single(),
            supabase.from("transactions").select("*").eq("user_id", auth.userId).order("created_at", { ascending: false })
        ]);

        if (employerRes.error) throw employerRes.error;
        if (transactionsRes.error) {
            console.error("Transactions fetch error:", transactionsRes.error);
            // Don't throw here, just return empty list as fallback or maybe an error flag
        }

        return NextResponse.json({
            plan: employerRes.data.plan || 'FREE',
            planExpiresAt: employerRes.data.plan_expires_at,
            transactions: transactionsRes.data || []
        });
    } catch (error: any) {
        console.error("Billing GET error:", error);
        return NextResponse.json({ error: "Failed to fetch billing info" }, { status: 500 });
    }
}

