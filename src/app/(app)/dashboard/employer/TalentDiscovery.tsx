"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Sparkles, Shield, MapPin, ChevronRight, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { requestProfileReveal } from "./actions";

interface Talent {
    id: string;
    summary: string;
    tier: number;
    skills: string[];
    location: string;
    revealStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
}

import { toast } from "sonner";

const TIERS = ["Cert", "Dip", "BSc", "MSc", "PhD"];

export function TalentDiscovery({ initialTalent, isApproved = true }: { initialTalent?: Talent[]; isApproved?: boolean }) {
    const [talent, setTalent] = useState<Talent[]>(initialTalent || []);
    const [loading, setLoading] = useState(!initialTalent && isApproved);

    useEffect(() => {
        if (initialTalent) {
            setTalent(initialTalent);
            setLoading(false);
            return;
        }

        if (!isApproved) {
            setLoading(false);
            return;
        }

        const fetchTalent = async () => {
            try {
                const res = await apiFetch("/api/employer/talent");
                if (res.ok) {
                    const data = await res.json();
                    setTalent(data);
                } else if (res.status === 403) {
                    const err = await res.json();
                    if (err.code === 'EMPLOYER_PENDING') {
                        // Silence error, the UI will reflect this via isApproved
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchTalent();
    }, [initialTalent, isApproved]);

    const handleRevealRequest = async (seekerId: string) => {
        if (!isApproved) {
            toast.error("Verification Required. Your account must be approved to request profile reveals.");
            return;
        }
        const res = await requestProfileReveal(seekerId);
        if (res.success) {
            toast.success("Request Sent Successfully");
            setTalent(prev => prev.map(t =>
                t.id === seekerId ? { ...t, revealStatus: "PENDING" } : t
            ));
        } else if (res.error) {
            toast.error(res.error);
        }
    };

    if (loading) return (
        <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
    );

    if (!isApproved && talent.length === 0) {
        return (
            <div className="py-20 bg-white rounded-[2.5rem] border border-slate-100 flex flex-col items-center text-center px-10">
                <div className="w-20 h-20 rounded-[2rem] bg-amber-50 flex items-center justify-center text-amber-600 mb-6 shadow-inner">
                    <Shield size={40} />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Talent Access Restriced</h3>
                <p className="text-sm font-medium text-slate-500 mt-2 max-w-sm">
                    To maintain our elite marketplace integrity, talent discovery is restricted until your corporate profile audit is complete.
                </p>
                <div className="mt-8 flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                    <Lock size={12} className="text-amber-500" /> Professional verification in progress
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <Sparkles className="text-blue-600" size={20} />
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Anonymized Talent Pool</h3>
                </div>
                <span className="text-xs font-bold text-slate-400">{talent.length} Matches Found</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {talent.map((t, idx) => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={t.id}
                        className="bg-white rounded-[2.5rem] border border-slate-200 p-8 hover:border-blue-400 transition-all group relative overflow-hidden"
                    >
                        {/* Status Badge */}
                        <div className="absolute top-6 right-8">
                            {t.tier >= 0 ? (
                                <div className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100/50">
                                    <Shield size={12} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Verified {TIERS[t.tier] || "Degree"}</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 bg-slate-50 text-slate-400 px-3 py-1 rounded-full border border-slate-100">
                                    <Lock size={12} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Basic Profile</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-400 font-black text-xl flex-shrink-0 shadow-inner">
                                    {idx + 1}
                                </div>
                                <div className="pt-1">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <MapPin size={12} /> {t.location || "Regional Talent"}
                                    </div>
                                    <p className="text-sm font-bold text-slate-500 mt-1 italic">
                                        "Candidate Summary"
                                    </p>
                                </div>
                            </div>

                            <p className="text-slate-800 font-medium leading-relaxed text-sm">
                                {t.summary}
                            </p>

                            <div className="flex flex-wrap gap-2">
                                {t.skills.slice(0, 4).map((s) => (
                                    <span key={s} className="px-3 py-1 bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-slate-100">
                                        {s}
                                    </span>
                                ))}
                                {t.skills.length > 4 && (
                                    <span className="text-[10px] font-black text-slate-400 self-center">+{t.skills.length - 4} more</span>
                                )}
                            </div>

                            <div className="pt-2 flex items-center gap-4">
                                <button
                                    onClick={() => handleRevealRequest(t.id)}
                                    disabled={t.revealStatus !== "NONE"}
                                    className={cn(
                                        "flex-1 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2",
                                        t.revealStatus === "NONE"
                                            ? "bg-slate-900 text-white hover:bg-blue-600 shadow-xl"
                                            : "bg-green-50 text-green-600 border border-green-100"
                                    )}
                                >
                                    {t.revealStatus === "NONE" ? (
                                        <>Request Full Profile <ChevronRight size={14} /></>
                                    ) : (
                                        <><CheckCircle2 size={14} /> {t.revealStatus === "PENDING" ? "Request Sent" : "Reveal Approved"}</>
                                    )}
                                </button>
                                <button className="w-12 h-12 rounded-2xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                                    <Lock size={18} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
