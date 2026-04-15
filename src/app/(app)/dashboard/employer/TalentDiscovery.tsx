"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Sparkles, Shield, MapPin, ChevronRight, Loader2, CheckCircle2, Lock } from "lucide-react";
import { Badge, EmptyState, SectionCard } from "@/components/dashboard/ui";
import { requestProfileReveal } from "./actions";
import { toast } from "sonner";

interface Talent {
    id: string;
    summary: string;
    tier: number;
    skills: string[];
    location: string;
    revealStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
}

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
                    if (err.code === "EMPLOYER_PENDING") {
                        return;
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
            toast.error("Verification required before requesting full profiles.");
            return;
        }
        const res = await requestProfileReveal(seekerId);
        if (res.success) {
            toast.success("Profile request sent");
            setTalent((prev) => prev.map((t) => (t.id === seekerId ? { ...t, revealStatus: "PENDING" } : t)));
        } else if (res.error) {
            toast.error(res.error);
        }
    };

    if (loading) {
        return (
            <div className="py-20 flex justify-center">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    if (!isApproved && talent.length === 0) {
        return (
            <SectionCard title="Talent matches">
                <EmptyState
                    icon={Shield}
                    title="Talent search is locked until approval"
                    description="Employers can browse anonymized candidate profiles once the company profile review is complete."
                    iconColor="text-amber-600"
                />
            </SectionCard>
        );
    }

    return (
        <SectionCard title="Talent matches">
            <div className="space-y-4 p-6">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Sparkles className="text-[#16324f]" size={16} />
                        <p className="text-sm text-slate-500 dark:text-slate-400">Anonymized profiles ranked by skills and fit.</p>
                    </div>
                    <Badge label={`${talent.length} matches`} variant="slate" />
                </div>

                {talent.length === 0 ? (
                    <EmptyState
                        icon={Sparkles}
                        title="No matches yet"
                        description="Run a talent search or wait for more candidates to enter the pool."
                        iconColor="text-[#16324f]"
                    />
                ) : (
                    <div className="space-y-3">
                        {talent.map((t, idx) => (
                            <div key={t.id} className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-sm font-semibold text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">
                                                {idx + 1}
                                            </span>
                                            <Badge variant={t.tier >= 0 ? "blue" : "outline"}>
                                                {t.tier >= 0 ? `Verified ${TIERS[t.tier] || "Profile"}` : "Basic profile"}
                                            </Badge>
                                            <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                                <MapPin size={12} />
                                                {t.location || "Location not shared"}
                                            </span>
                                        </div>
                                        <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">{t.summary}</p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {t.skills.slice(0, 5).map((s) => (
                                                <span key={s} className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                    {s}
                                                </span>
                                            ))}
                                            {t.skills.length > 5 && (
                                                <span className="px-1 py-1 text-xs text-slate-500 dark:text-slate-400">+{t.skills.length - 5} more</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-3 lg:w-52 lg:flex-col">
                                        <button
                                            onClick={() => handleRevealRequest(t.id)}
                                            disabled={t.revealStatus !== "NONE"}
                                            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#16324f] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-green-50 disabled:text-green-700"
                                        >
                                            {t.revealStatus === "NONE" ? (
                                                <>
                                                    Request profile
                                                    <ChevronRight size={16} />
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 size={16} />
                                                    {t.revealStatus === "PENDING" ? "Requested" : "Approved"}
                                                </>
                                            )}
                                        </button>
                                        <div className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-200 px-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                            <Lock size={16} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </SectionCard>
    );
}
