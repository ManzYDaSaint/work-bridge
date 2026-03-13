"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Eye, Check, X, Shield, Clock, Loader2, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { respondToRevealRequest } from "./actions";
import { toast } from "sonner";

interface RevealRequest {
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    createdAt: string;
    employer: {
        id: string;
        companyName: string;
    };
}

export function RevealRequestCenter() {
    const [requests, setRequests] = useState<RevealRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);

    const fetchRequests = async () => {
        try {
            const res = await apiFetch("/api/me/reveals");
            if (res.ok) setRequests(await res.json());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleResponse = async (id: string, status: "APPROVED" | "REJECTED") => {
        setProcessing(id);
        try {
            const res = await respondToRevealRequest(id, status);
            if (res.success) {
                toast.success(status === "APPROVED" ? "Profile revealed!" : "Request declined");
                setRequests(prev => prev.filter(r => r.id !== id));
            } else {
                toast.error(res.error || "Failed to respond");
            }
        } finally {
            setProcessing(null);
        }
    };

    if (loading) return null;
    if (requests.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 px-2">
                <Shield className="text-blue-600" size={18} />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Privacy Requests</h3>
                <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                    {requests.length}
                </span>
            </div>

            <div className="grid gap-4">
                <AnimatePresence>
                    {requests.map((req) => (
                        <motion.div
                            key={req.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col sm:flex-row items-center gap-6"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 shadow-inner">
                                <Building2 size={24} />
                            </div>

                            <div className="flex-1 text-center sm:text-left">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Reveal Request</p>
                                <p className="text-lg font-black text-slate-900 tracking-tight">{req.employer.companyName}</p>
                                <div className="flex items-center justify-center sm:justify-start gap-4 mt-1">
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        <Clock size={12} /> {new Date(req.createdAt).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-widest">
                                        <Eye size={12} /> Full Profile
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <button
                                    onClick={() => handleResponse(req.id, "REJECTED")}
                                    disabled={!!processing}
                                    className="flex-1 sm:px-6 h-12 rounded-2xl border border-slate-200 text-slate-400 hover:bg-slate-50 transition-all font-black text-[10px] uppercase tracking-widest"
                                >
                                    Decline
                                </button>
                                <button
                                    onClick={() => handleResponse(req.id, "APPROVED")}
                                    disabled={!!processing}
                                    className="flex-1 sm:px-8 h-12 rounded-2xl bg-slate-900 text-white hover:bg-blue-600 transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-slate-900/10"
                                >
                                    {processing === req.id ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                                    Approve Reveal
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
