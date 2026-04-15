"use client";

import { ShieldAlert, Clock, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export function PendingBanner() {
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded-[2rem] flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl group-hover:scale-150 transition-transform duration-1000" />

            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 flex-shrink-0 shadow-inner">
                <ShieldAlert size={32} />
            </div>

            <div className="flex-1 text-center md:text-left">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center justify-center md:justify-start gap-2">
                    Verification In Progress
                    <Clock size={16} className="text-amber-500 animate-pulse" />
                </h3>
                <p className="text-sm font-medium text-slate-500 mt-1 max-w-2xl">
                    Your corporate profile is currently being audited by our trust team. While you are in "Signal Pending" status, job deployments and full talent profile reveals are restricted to maintain marketplace integrity.
                </p>
            </div>

            <div className="flex flex-col items-center md:items-end gap-2">
                <span className="px-4 py-1.5 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-200">
                    Status: Pending Audit
                </span>
                <button className="text-[10px] font-bold text-slate-400 hover:text-amber-600 transition-colors flex items-center gap-1 group">
                    Learn about verification <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </motion.div>
    );
}
