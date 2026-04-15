"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Eye, Check, Clock, Loader2, Building2 } from "lucide-react";
import { respondToRevealRequest } from "./actions";
import { toast } from "sonner";
import { Badge, SectionCard } from "@/components/dashboard/ui";

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
                toast.success(status === "APPROVED" ? "Profile revealed" : "Request declined");
                setRequests((prev) => prev.filter((r) => r.id !== id));
            } else {
                toast.error(res.error || "Failed to respond");
            }
        } finally {
            setProcessing(null);
        }
    };

    if (loading || requests.length === 0) return null;

    return (
        <SectionCard title="Privacy requests">
            <div className="space-y-3 p-6">
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Employers can ask to reveal your full profile before moving forward.</p>
                    <Badge label={`${requests.length} open`} variant="yellow" />
                </div>

                {requests.map((req) => (
                    <div key={req.id} className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                                    <Building2 size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{req.employer.companyName}</p>
                                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                        <span className="inline-flex items-center gap-1"><Clock size={12} /> {new Date(req.createdAt).toLocaleDateString()}</span>
                                        <span className="inline-flex items-center gap-1"><Eye size={12} /> Full profile request</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleResponse(req.id, "REJECTED")}
                                    disabled={!!processing}
                                    className="inline-flex h-10 items-center justify-center rounded-xl border border-stone-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-white disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                    Decline
                                </button>
                                <button
                                    onClick={() => handleResponse(req.id, "APPROVED")}
                                    disabled={!!processing}
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#16324f] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                                >
                                    {processing === req.id ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                                    Approve
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </SectionCard>
    );
}
