"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { apiFetchJson } from "@/lib/api";

function SuccessHandler() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("Verifying your payment...");

    useEffect(() => {
        const verifyPayment = async () => {
            const tx_ref = searchParams.get("tx_ref");
            
            if (!tx_ref) {
                setStatus("error");
                setMessage("No transaction reference found.");
                return;
            }

            try {
                // If it's an employer premium checkout:
                if (tx_ref.startsWith("wb-emp-premium-")) {
                    const res = await apiFetchJson<{ ok?: boolean; message?: string; error?: string }>("/api/employer/billing", {
                        method: "POST",
                        body: JSON.stringify({ tx_ref }),
                    });
                    
                    if (res.ok || res.message === "Transaction already processed successfully") {
                        setStatus("success");
                        setMessage("Payment successful! Redirecting to your dashboard...");
                        setTimeout(() => router.push("/dashboard/employer/billing"), 2000);
                    } else {
                        setStatus("error");
                        setMessage(res.error || "Failed to verify transaction.");
                    }
                } else {
                    // Placeholder for when job seekers hit this page
                    setStatus("success");
                    setMessage("Payment logged via webhook. Redirecting...");
                    setTimeout(() => router.push("/dashboard/seeker"), 2000);
                }
            } catch (err) {
                setStatus("error");
                setMessage("A network error occurred while verifying.");
            }
        };

        verifyPayment();
    }, [searchParams, router]);

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
            {status === "loading" && <Loader2 className="h-12 w-12 animate-spin text-blue-600" />}
            {status === "success" && <CheckCircle className="h-12 w-12 text-emerald-500" />}
            {status === "error" && <XCircle className="h-12 w-12 text-red-500" />}
            
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
                {status === "loading" ? "Processing Payment" : status === "success" ? "Thank You!" : "Payment Issue"}
            </h2>
            <p className="text-slate-500">{message}</p>
            
            {status === "error" && (
                <button 
                    onClick={() => router.push("/dashboard/employer/billing")}
                    className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                >
                    Return to Billing
                </button>
            )}
        </div>
    );
}

export default function SuccessPage() {
    return (
        <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <SuccessHandler />
        </Suspense>
    );
}
