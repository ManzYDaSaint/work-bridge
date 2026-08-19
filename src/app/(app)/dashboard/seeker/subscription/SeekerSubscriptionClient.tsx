"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/ui";
import {
    Crown, Sparkles, CheckCircle2, MessageSquare, Zap, ShieldCheck,
    CreditCard, ArrowRight, Loader2, Phone, Bell, AlertCircle, RefreshCw, X, Send
} from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { formatMalawiPhone } from "@/lib/phone-utils";

export default function SeekerSubscriptionClient() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [selectedPlanMonths, setSelectedPlanMonths] = useState<number>(1);
    const [phone, setPhone] = useState<string>("");
    const [phoneError, setPhoneError] = useState<string | undefined>(undefined);
    const [whatsappEnabled, setWhatsappEnabled] = useState<boolean>(true);
    const [minMatchScore, setMinMatchScore] = useState<number>(60);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [updatingPrefs, setUpdatingPrefs] = useState<boolean>(false);
    const [testingAlert, setTestingAlert] = useState<boolean>(false);
    const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);

    const searchParams = useSearchParams();
    const reference = searchParams.get("reference") || searchParams.get("tx_ref");
    const paymentStatus = searchParams.get("status");

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await apiFetch("/api/seeker/subscription");
            if (res.ok) {
                const resData = await res.json();
                setData(resData);
                setPhone(resData.seeker?.phone || "");
                if (resData.preferences) {
                    setWhatsappEnabled(resData.preferences.whatsapp_enabled ?? true);
                    setMinMatchScore(resData.preferences.min_match_score || 60);
                }
            }
        } catch {
            toast.error("Failed to load subscription status");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handlePhoneBlur = () => {
        if (!phone) return;
        const check = formatMalawiPhone(phone);
        if (check.isValid) {
            setPhone(check.formatted);
            setPhoneError(undefined);
        } else {
            setPhoneError(check.error);
        }
    };

    // Handle return from PayChangu checkout callback
    useEffect(() => {
        if (!reference) return;

        // Check if user cancelled or payment failed on PayChangu redirect
        if (paymentStatus === "failed" || paymentStatus === "cancelled" || paymentStatus === "canceled" || paymentStatus === "declined") {
            toast.error("Payment was cancelled or failed on PayChangu.");
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }

        handleVerifyPayment(reference);
    }, [reference, paymentStatus]);

    const handleVerifyPayment = async (ref: string) => {
        setSubmitting(true);
        try {
            const res = await apiFetch("/api/seeker/subscription", {
                method: "POST",
                body: JSON.stringify({
                    action: "VERIFY_PAYMENT",
                    reference: ref,
                    durationMonths: selectedPlanMonths
                })
            });

            const resData = await res.json();
            if (res.ok && resData.success && resData.verified) {
                toast.success("Congratulations! Your Aganyu Premium is now active!");
                fetchData();
            } else {
                toast.error(resData.error || resData.message || "Payment verification failed. Payment was not completed.");
            }
        } catch {
            toast.error("Payment confirmation error");
        } finally {
            setSubmitting(false);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    };

    const handleCheckout = async () => {
        if (!phone) {
            toast.error("Please enter a valid WhatsApp phone number first.");
            return;
        }

        const phoneCheck = formatMalawiPhone(phone);
        if (!phoneCheck.isValid) {
            setPhoneError(phoneCheck.error);
            toast.error(phoneCheck.error || "Please provide a valid Malawian phone number.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await apiFetch("/api/seeker/subscription", {
                method: "POST",
                body: JSON.stringify({
                    action: "INITIATE_CHECKOUT",
                    durationMonths: selectedPlanMonths,
                    phone: phoneCheck.formatted
                })
            });

            const resData = await res.json();
            if (res.ok && resData.paymentUrl) {
                if (resData.isSimulated || resData.paymentUrl.includes("status=simulated")) {
                    toast.info("Simulation mode: verifying test payment...");
                    await handleVerifyPayment(resData.reference);
                } else {
                    window.location.href = resData.paymentUrl;
                }
            } else {
                toast.error(resData.error || "Checkout initiation failed");
            }
        } catch {
            toast.error("Checkout request failed");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSavePreferences = async () => {
        let formattedPhone = phone;
        if (phone) {
            const phoneCheck = formatMalawiPhone(phone);
            if (!phoneCheck.isValid) {
                setPhoneError(phoneCheck.error);
                toast.error(phoneCheck.error || "Please enter a valid Malawian phone number.");
                return;
            }
            formattedPhone = phoneCheck.formatted;
            setPhone(formattedPhone);
            setPhoneError(undefined);
        }

        setUpdatingPrefs(true);
        try {
            const res = await apiFetch("/api/seeker/subscription", {
                method: "POST",
                body: JSON.stringify({
                    action: "UPDATE_PREFERENCES",
                    phone: formattedPhone,
                    whatsappEnabled,
                    minMatchScore
                })
            });

            if (res.ok) {
                toast.success("WhatsApp alert preferences updated!");
            } else {
                const resData = await res.json();
                toast.error(resData.error || "Failed to update preferences");
            }
        } catch {
            toast.error("Update error");
        } finally {
            setUpdatingPrefs(false);
        }
    };

    const handleSendTestAlert = async () => {
        if (!phone) {
            toast.error("Please enter a WhatsApp phone number first.");
            return;
        }

        const phoneCheck = formatMalawiPhone(phone);
        if (!phoneCheck.isValid) {
            setPhoneError(phoneCheck.error);
            toast.error(phoneCheck.error || "Invalid Malawian phone number.");
            return;
        }

        setTestingAlert(true);
        try {
            const res = await apiFetch("/api/seeker/subscription", {
                method: "POST",
                body: JSON.stringify({
                    action: "SEND_TEST_ALERT",
                    phone: phoneCheck.formatted
                })
            });

            const resData = await res.json();
            if (res.ok && resData.success) {
                toast.success(resData.message || "Test WhatsApp alert triggered!");
            } else {
                toast.error(resData.error || "Failed to send test WhatsApp alert");
            }
        } catch {
            toast.error("Test alert request error");
        } finally {
            setTestingAlert(false);
        }
    };

    const handleCancelSub = async () => {
        if (!confirm("Are you sure you want to cancel your Premium subscription?")) return;
        setSubmitting(true);
        try {
            const res = await apiFetch("/api/seeker/subscription", {
                method: "POST",
                body: JSON.stringify({ action: "CANCEL_SUBSCRIPTION" })
            });

            if (res.ok) {
                toast.success("Subscription cancelled.");
                fetchData();
            }
        } catch {
            toast.error("Cancellation failed");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="animate-spin text-amber-500" size={32} />
            </div>
        );
    }

    const isPremium = data?.isPremium;
    const subscription = data?.subscription;

    return (
        <div className="space-y-6 pb-20 max-w-5xl mx-auto">
            <PageHeader
                title="Aganyu Premium & WhatsApp Job Alerts"
                subtitle="Get instant WhatsApp alerts when high-matching jobs are published in Malawi."
            />

            {/* Current Status Header Banner */}
            <div className={`rounded-3xl border p-6 shadow-sm transition-all ${isPremium
                ? "border-amber-200 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:border-amber-900/40 dark:bg-slate-900"
                : "border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                }`}>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${isPremium ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30" : "bg-stone-100 text-slate-400 dark:bg-slate-800"
                            }`}>
                            <Crown size={28} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    {isPremium ? "Aganyu Premium Active" : "Free Plan Account"}
                                </h3>
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${isPremium ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800"
                                    }`}>
                                    {isPremium ? "PREMIUM" : "FREE"}
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {isPremium
                                    ? `Your premium subscription is valid until ${new Date(subscription?.ends_at).toLocaleDateString()}.`
                                    : "Upgrade to receive instant AI-matched WhatsApp job alerts before public listing."}
                            </p>
                        </div>
                    </div>

                    <div>
                        {!isPremium ? (
                            <button
                                onClick={() => setShowCheckoutModal(true)}
                                className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-amber-500/30 hover:bg-amber-600 transition-all"
                            >
                                <Sparkles size={16} /> Upgrade for MWK 500/mo
                            </button>
                        ) : (
                            <button
                                onClick={handleCancelSub}
                                disabled={submitting}
                                className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-slate-500 hover:text-red-600 dark:border-slate-700"
                            >
                                Cancel Subscription
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Premium Benefits Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold mb-3">
                        <MessageSquare size={20} />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Instant WhatsApp Alerts</h4>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Never miss a deadline. High-matching jobs are delivered straight to your WhatsApp.
                    </p>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold mb-3">
                        <Zap size={20} />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Malawian Hybrid AI Matcher</h4>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Evaluates qualifications (PhD to MSCE), experience, and skills specifically tailored to Malawian employers.
                    </p>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold mb-3">
                        <ShieldCheck size={20} />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Early Application Advantage</h4>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Be among the first 10 applicants when top employers publish new vacancies.
                    </p>
                </div>
            </div>

            {/* Notification Preferences Card */}
            <div className="rounded-3xl border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 space-y-5">
                <div className="flex items-center justify-between border-b border-stone-100 pb-4 dark:border-slate-800">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-base">
                        <Bell className="text-amber-500" size={20} /> WhatsApp Notification Preferences
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                            WhatsApp Phone Number (with Country Code)
                        </label>
                        <div className="relative">
                            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="+265 99 353 3315 or 0993533315"
                                value={phone}
                                onChange={(e) => {
                                    setPhone(e.target.value);
                                    if (phoneError) setPhoneError(undefined);
                                }}
                                onBlur={handlePhoneBlur}
                                className={`w-full rounded-2xl border bg-stone-50 pl-10 pr-4 py-2.5 text-sm outline-none transition-all dark:bg-slate-800 dark:text-white ${phoneError ? "border-red-500 focus:border-red-500" : "border-stone-200 focus:border-amber-500 dark:border-slate-700"
                                    }`}
                            />
                        </div>
                        {phoneError ? (
                            <p className="text-[11px] font-semibold text-red-500">{phoneError}</p>
                        ) : (
                            <p className="text-[11px] text-slate-400">Supported formats: +26599..., 099..., 088...</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                            Minimum Match Relevance Score (% Threshold)
                        </label>
                        <select
                            value={minMatchScore}
                            onChange={(e) => setMinMatchScore(Number(e.target.value))}
                            className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                            <option value={50}>50% and above (All Potential Matches)</option>
                            <option value={65}>65% and above (Good Matches)</option>
                            <option value={80}>80% and above (High Precision Only)</option>
                        </select>
                    </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={whatsappEnabled}
                            onChange={(e) => setWhatsappEnabled(e.target.checked)}
                            className="h-4 w-4 rounded border-stone-300 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Enable WhatsApp notifications for job matches
                        </span>
                    </label>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSendTestAlert}
                            disabled={testingAlert}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-stone-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                            {testingAlert ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Test Alert
                        </button>

                        <button
                            onClick={handleSavePreferences}
                            disabled={updatingPrefs}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
                        >
                            {updatingPrefs ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Save Preferences
                        </button>
                    </div>
                </div>
            </div>

            {/* Checkout / Upgrade Modal */}
            {showCheckoutModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-5">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-4 dark:border-slate-800">
                            <div className="flex items-center gap-2 text-amber-500 font-bold text-lg">
                                <Crown size={22} /> Subscribe to Aganyu Premium
                            </div>
                            <button onClick={() => setShowCheckoutModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Duration Selector */}
                        <div className="space-y-3">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                                Select Plan Duration
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { months: 1, label: "1 Month", price: "MWK 500" },
                                    { months: 3, label: "3 Months", price: "MWK 1,350", badge: "Save 10%" },
                                    { months: 6, label: "6 Months", price: "MWK 2,550", badge: "Save 15%" },
                                ].map((p) => (
                                    <button
                                        key={p.months}
                                        type="button"
                                        onClick={() => setSelectedPlanMonths(p.months)}
                                        className={`rounded-2xl border p-3 text-center transition-all ${selectedPlanMonths === p.months
                                            ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold shadow-sm"
                                            : "border-stone-200 bg-stone-50/50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/50"
                                            }`}
                                    >
                                        <p className="text-xs">{p.label}</p>
                                        <p className="text-sm font-extrabold mt-1">{p.price}</p>
                                        {p.badge && <span className="mt-1 inline-block rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{p.badge}</span>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Phone Check */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                WhatsApp Number for Job Alerts
                            </label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+265 99 xxx xxxx"
                                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                        </div>

                        {/* Payment Providers Supported */}
                        <div className="rounded-2xl bg-stone-50 p-4 dark:bg-slate-800/50 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                <CreditCard size={18} className="text-amber-500" /> Pay via PayChangu (Airtel Money / Mpamba / Card)
                            </div>
                            <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                                MWK {(selectedPlanMonths * 500).toLocaleString()}
                            </span>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowCheckoutModal(false)}
                                className="flex-1 rounded-2xl border border-stone-200 py-3 text-xs font-bold text-slate-600 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCheckout}
                                disabled={submitting}
                                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3 text-xs font-bold text-white shadow-lg shadow-amber-500/30 hover:bg-amber-600"
                            >
                                {submitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />} Pay Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
