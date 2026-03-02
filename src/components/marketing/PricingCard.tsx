"use client";

import CheckoutButton from "@/components/CheckoutButton";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function PricingCard({
    title,
    price,
    features,
    isPopular,
    billingCycle = "mo"
}: {
    title: string;
    price: string;
    features: string[];
    isPopular?: boolean;
    billingCycle?: string;
}) {
    return (
        <motion.div
            whileHover={{ y: -8 }}
            className={cn(
                "relative group p-8 md:p-10 rounded-[2.5rem] flex flex-col transition-all duration-300 overflow-hidden",
                isPopular
                    ? "bg-white dark:bg-slate-900 border-2 border-blue-600 shadow-2xl shadow-blue-500/10"
                    : "bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/50 backdrop-blur-xl"
            )}
        >
            {/* Subtle glow effect on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gradient-to-br from-blue-500/5 via-transparent to-transparent" />

            {isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-blue-600/90 backdrop-blur-md text-white text-xs font-black uppercase tracking-widest rounded-full shadow-[0_0_20px_rgba(37,99,235,0.5)] border border-blue-400/30 z-10">
                    Most Popular
                </div>
            )}

            <div className="mb-8 relative z-10">
                <h3 className="text-xl font-black mb-2 tracking-tight group-hover:text-blue-600 transition-colors uppercase">{title}</h3>
                <div className="flex items-baseline gap-2">
                    <span className="text-5xl lg:text-6xl font-black tracking-tighter text-slate-900 dark:text-white">{price}</span>
                    <span className="text-slate-500 font-medium">/{billingCycle}</span>
                </div>
            </div>

            <ul className="space-y-5 mb-10 flex-grow relative z-10">
                {features.map((f, i) => (
                    <li key={i} className="flex items-start gap-4 group/item">
                        <div className="mt-1 w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover/item:bg-blue-600 transition-colors shrink-0">
                            <Check className="text-blue-600 group-hover/item:text-white transition-colors" size={14} strokeWidth={4} />
                        </div>
                        <span className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                            {f}
                        </span>
                    </li>
                ))}
            </ul>

            <div className="relative mt-auto z-10">
                <CheckoutButton priceId={title.toLowerCase()} />
            </div>
        </motion.div>
    );
}
