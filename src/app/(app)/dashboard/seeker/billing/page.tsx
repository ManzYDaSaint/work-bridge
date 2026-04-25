"use client";

import { useEffect, useState } from "react";
import { apiFetchJson } from "@/lib/api";
import { Loader2, CheckCircle2, Sparkles, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/dashboard/ui";
import { toast } from "sonner";

interface SeekerBillingData {
    isSubscribed: boolean;
    hasBadge: boolean;
    transactions: any[];
}

export default function SeekerBillingPage() {
    const [data, setData] = useState<SeekerBillingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [processingPlus, setProcessingPlus] = useState(false);
    const [processingBadge, setProcessingBadge] = useState(false);

    useEffect(() => {
        apiFetchJson<SeekerBillingData>("/api/seeker/billing")
            .then(setData)
            .catch(() => toast.error("Failed to load billing info"))
            .finally(() => setLoading(false));
    }, []);

    const handleCheckout = async (type: "PLUS" | "BADGE") => {
        if (type === "PLUS") setProcessingPlus(true);
        if (type === "BADGE") setProcessingBadge(true);

        try {
            const res = await apiFetchJson<{ checkoutUrl: string }>("/api/checkout/seeker", {
                method: "POST",
                body: JSON.stringify({ type })
            });
            if (res.checkoutUrl) {
                window.location.href = res.checkoutUrl;
            } else {
                throw new Error("No checkout URL returned");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to initialize checkout");
            if (type === "PLUS") setProcessingPlus(false);
            if (type === "BADGE") setProcessingBadge(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center min-h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-[#16324f]" /></div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-16 px-1 sm:px-0">
            <PageHeader
                title="Upgrade Your Profile"
                subtitle="Stand out to employers and accelerate your job search."
            />

            <div className="grid md:grid-cols-2 gap-6">
                {/* Plus Subscription Card */}
                <div className={`rounded-3xl border p-6 flex flex-col ${data?.isSubscribed ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-500/50' : 'border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="text-blue-500" size={24} />
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">WorkBridge Pro</h2>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Everything you need to stay ahead of the competition.</p>
                        
                        <div className="mb-6">
                            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">MWK 2,500</span>
                            <span className="text-slate-500 font-medium"> / month</span>
                        </div>

                        <ul className="space-y-3 mb-8">
                            {[
                                "SMS & WhatsApp Job Alerts",
                                "Application ranking insights",
                                "Read receipts for applications",
                                "Priority customer support"
                            ].map((feature, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                                    <CheckCircle2 size={18} className="text-blue-500 shrink-0" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {data?.isSubscribed ? (
                        <div className="w-full py-3 px-4 rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-semibold text-center text-sm flex items-center justify-center gap-2">
                            <CheckCircle2 size={18} /> Active Subscription
                        </div>
                    ) : (
                        <button
                            onClick={() => handleCheckout("PLUS")}
                            disabled={processingPlus}
                            className="w-full py-3 px-4 rounded-xl bg-[#16324f] hover:bg-[#1a3b5c] text-white font-semibold transition flex justify-center items-center gap-2"
                        >
                            {processingPlus ? <Loader2 size={18} className="animate-spin" /> : null}
                            Subscribe via PayChangu
                        </button>
                    )}
                </div>

                {/* Badge Card */}
                <div className={`rounded-3xl border p-6 flex flex-col ${data?.hasBadge ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-500/50' : 'border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck className="text-amber-500" size={24} />
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Featured Badge</h2>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Boost your visibility permanently in employer searches.</p>
                        
                        <div className="mb-6">
                            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">MWK 3,500</span>
                            <span className="text-slate-500 font-medium"> / lifetime</span>
                        </div>

                        <ul className="space-y-3 mb-8">
                            {[
                                "Featured Candidate badge on profile",
                                "Higher ranking in talent searches",
                                "Stand out in application lists",
                                "Permanent profile boost"
                            ].map((feature, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                                    <CheckCircle2 size={18} className="text-amber-500 shrink-0" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {data?.hasBadge ? (
                        <div className="w-full py-3 px-4 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-semibold text-center text-sm flex items-center justify-center gap-2">
                            <CheckCircle2 size={18} /> Badge Unlocked
                        </div>
                    ) : (
                        <button
                            onClick={() => handleCheckout("BADGE")}
                            disabled={processingBadge}
                            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition flex justify-center items-center gap-2"
                        >
                            {processingBadge ? <Loader2 size={18} className="animate-spin" /> : null}
                            Get Badge via PayChangu
                        </button>
                    )}
                </div>
            </div>

            {/* Transaction History */}
            {data?.transactions && data.transactions.length > 0 && (
                <div className="mt-12">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Payment History</h3>
                    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-stone-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Date</th>
                                    <th className="px-4 py-3 font-medium">Amount</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium">Reference</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-200 dark:divide-slate-800">
                                {data.transactions.map((tx) => (
                                    <tr key={tx.id}>
                                        <td className="px-4 py-3 text-slate-900 dark:text-slate-300">
                                            {new Date(tx.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                            {tx.currency} {tx.amount.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                                tx.status === 'SUCCESS' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                'bg-stone-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                            }`}>
                                                {tx.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                                            {tx.tx_ref}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
