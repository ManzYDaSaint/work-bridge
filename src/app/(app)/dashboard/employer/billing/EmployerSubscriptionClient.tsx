"use client";

import React, { useState } from "react";
import { 
  Crown, Sparkles, CheckCircle2, 
  CreditCard, ArrowRight, Lock, X
} from "lucide-react";
import { PageHeader, Badge } from "@/components/dashboard/ui";

export default function EmployerSubscriptionClient({ employer }: { employer: any }) {
  const currentPlan = employer?.plan || "FREE";
  const isPro = currentPlan === "PRO" || currentPlan === "ENTERPRISE";

  const [selectedPeriod, setSelectedPeriod] = useState<"MONTHLY" | "QUARTERLY">("MONTHLY");
  const [submitting, setSubmitting] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  const price = selectedPeriod === "MONTHLY" ? 25000 : 60000;
  const periodLabel = selectedPeriod === "MONTHLY" ? "/ month" : "/ 3 months (Save 20%)";

  const handleInitiateUpgrade = () => {
    setShowCheckout(true);
  };

  const handleCheckout = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/employer/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "INITIATE_CHECKOUT",
          period: selectedPeriod,
          amount: price,
        }),
      });

      const data = await res.json();
      if (res.ok && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        alert(data.error || "Failed to initialize payment");
      }
    } catch (err: any) {
      alert(err.message || "Payment processing error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      <PageHeader
        title="Employer Plans & Billing"
        subtitle="Compare tiers, unlock candidate talent pools, scorecard rubrics, and direct 1-tap WhatsApp outreach."
      />

      {/* Header Status Banner */}
      <div className={`rounded-3xl border p-6 transition-all ${isPro
        ? "border-amber-400/60 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20"
        : "border-stone-200/80 bg-white dark:border-slate-800 dark:bg-slate-900"
        }`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start sm:items-center gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${isPro ? "bg-amber-400 text-slate-950 shadow-xs" : "bg-stone-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                }`}>
              <Crown size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {isPro ? "Employer Pro Active" : "Free Starter Plan"}
                </h3>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider ${isPro ? "bg-amber-400 text-slate-950" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}>
                  {currentPlan}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {isPro
                  ? "Your team has full access to unlimited listings, talent pools, and candidate scorecards."
                  : "Upgrade to Employer Pro for unlimited candidate views, 1-tap WhatsApp invites, and verified badges."}
              </p>
            </div>
          </div>

          {!isPro && (
            <button
              onClick={handleInitiateUpgrade}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#16324f] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#16324f]/90 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300"
            >
              <Sparkles size={15} /> Upgrade to Pro
            </button>
          )}
        </div>
      </div>

      {/* Period Switcher */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-2xl border border-stone-200/80 bg-stone-100/70 p-1 dark:border-slate-800 dark:bg-slate-900/80">
          <button
            type="button"
            onClick={() => setSelectedPeriod("MONTHLY")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedPeriod === "MONTHLY"
                ? "bg-white dark:bg-slate-800 text-[#16324f] dark:text-amber-400 shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Monthly (MWK 25,000)
          </button>
          <button
            type="button"
            onClick={() => setSelectedPeriod("QUARTERLY")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedPeriod === "QUARTERLY"
                ? "bg-white dark:bg-slate-800 text-[#16324f] dark:text-amber-400 shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Quarterly (Save 20%)
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              Best Value
            </span>
          </button>
        </div>
      </div>

      {/* Plans Comparison Grid */}
      <div className="grid gap-6 md:grid-cols-2 items-stretch">
        {/* FREE PLAN CARD */}
        <div className="flex flex-col justify-between rounded-3xl border border-stone-200/90 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/90 transition-all hover:border-stone-300 dark:hover:border-slate-700">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Basic Tier</span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">Free Starter</h3>
              </div>
              {currentPlan === "FREE" && (
                <Badge label="Current Active Plan" variant="slate" />
              )}
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Standard tier for single job postings and initial candidate discovery.
            </p>

            <div className="py-2 border-y border-stone-100 dark:border-slate-800/80">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">MWK 0</span>
                <span className="text-xs font-medium text-slate-400">/ forever</span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Included Caps & Features</p>
              <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span><strong>1 Active Job Listing</strong> at a time</span>
                </li>
                <li className="flex items-center gap-2.5 text-slate-500">
                  <Lock size={15} className="text-amber-500/80 shrink-0" />
                  <span>Max 1 Talent Pool folder (5 candidates)</span>
                </li>
                <li className="flex items-center gap-2.5 text-slate-500">
                  <Lock size={15} className="text-amber-500/80 shrink-0" />
                  <span>30 Candidate contact views / month</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Basic Applicant Pipeline Board</span>
                </li>
                <li className="flex items-center gap-2.5 text-slate-400">
                  <X size={15} className="text-slate-300 dark:text-slate-700 shrink-0" />
                  <span className="line-through decoration-slate-300 dark:decoration-slate-700">Direct 1-Tap WhatsApp Invites</span>
                </li>
                <li className="flex items-center gap-2.5 text-slate-400">
                  <X size={15} className="text-slate-300 dark:text-slate-700 shrink-0" />
                  <span className="line-through decoration-slate-300 dark:decoration-slate-700">Verified Recruiter Badge</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6">
            <button
              disabled
              className="w-full rounded-2xl border border-stone-200 bg-stone-50/80 py-3 text-center text-xs font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-500"
            >
              {currentPlan === "FREE" ? "Active Free Starter" : "Standard Tier"}
            </button>
          </div>
        </div>

        {/* PRO PLAN CARD */}
        <div className="relative flex flex-col justify-between rounded-3xl border-2 border-[#16324f] bg-white p-6 dark:border-amber-400 dark:bg-slate-900 transition-all hover:shadow-lg dark:hover:shadow-amber-400/5">
          <span className="absolute -top-3 right-6 rounded-full bg-[#16324f] px-3.5 py-1 text-[10px] font-extrabold text-white uppercase tracking-wider dark:bg-amber-400 dark:text-slate-950 shadow-xs">
            Recommended
          </span>

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#16324f] dark:text-amber-400 flex items-center gap-1">
                  <Sparkles size={12} className="text-amber-500" /> Unlimited Recruiter Suite
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">Employer Pro</h3>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Full access to candidate talent pools, structured scorecard rubrics, and instant 1-tap outreach.
            </p>

            <div className="py-2 border-y border-stone-100 dark:border-slate-800/80">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  MWK {price.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{periodLabel}</span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#16324f] dark:text-amber-400">Everything in Free, Plus Unlocks:</p>
              <ul className="space-y-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span><strong>Unlimited Active Job Listings</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Unlimited Custom Talent Pools & Folders</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Unlimited Candidate Contact Views</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Candidate Scorecards (1-5★ Evaluation Rubrics)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Direct 1-Tap WhatsApp Candidate Outreach</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Verified Recruiter Badge</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6">
            {isPro ? (
              <button
                disabled
                className="w-full rounded-2xl bg-emerald-50 py-3 text-center text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                ✓ Active Employer Pro Subscription
              </button>
            ) : (
              <button
                onClick={handleInitiateUpgrade}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#16324f] py-3 text-xs font-bold text-white transition hover:bg-[#16324f]/90 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300 shadow-xs"
              >
                Upgrade to Employer Pro <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard size={18} className="text-amber-500" /> PayChangu Online Checkout
              </h3>
              <button onClick={() => setShowCheckout(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Plan Duration:</span>
                <strong className="text-slate-900 dark:text-white">Employer Pro ({selectedPeriod})</strong>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total Amount:</span>
                <strong className="text-base font-bold text-[#16324f] dark:text-amber-400">MWK {price.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between text-slate-500 pt-1 border-t border-stone-200/60 dark:border-slate-700">
                <span>Payment Gateway:</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">Airtel Money / Mpamba / Card</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCheckout(false)}
                className="flex-1 rounded-2xl border border-stone-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-stone-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckout}
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#16324f] py-2.5 text-xs font-bold text-white transition hover:bg-[#16324f]/90 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300"
              >
                {submitting ? "Redirecting..." : "Proceed to Checkout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

