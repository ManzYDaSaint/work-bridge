"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Loader2, MapPin, BookmarkMinus, Bookmark } from "lucide-react";
import { PageHeader, Badge } from "@/components/dashboard/ui";
import Link from "next/link";
import { toast } from "sonner";

interface SavedCandidate {
    saved_id: string;
    saved_at: string;
    seeker: {
        id: string;
        full_name: string;
        bio: string | null;
        location: string | null;
        skills: string[];
        avatar_url: string | null;
        seniority_level: string | null;
        employment_type: string | null;
        employment_status: string | null;
        search_intent: string;
        profile_visibility: string;
    };
}

export default function SavedTalentPage() {
    const [saved, setSaved] = useState<SavedCandidate[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSaved = async () => {
        setLoading(true);
        try {
            const res = await apiFetch(`/api/employer/talent/saved`);
            if (res.ok) {
                const data = await res.json();
                setSaved(data || []);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSaved();
    }, []);

    const handleUnsave = async (seekerId: string, e: React.MouseEvent) => {
        e.preventDefault(); // Prevent navigating to profile
        try {
            const res = await apiFetch(`/api/employer/talent/${seekerId}/save`, { method: "DELETE" });
            if (res.ok) {
                setSaved(saved.filter(s => s.seeker.id !== seekerId));
                toast.success("Removed from saved candidates");
            }
        } catch {
            toast.error("Failed to remove");
        }
    };

    const formatIntent = (intent: string) => {
        switch (intent) {
            case "ACTIVELY_LOOKING": return "Actively Looking";
            case "OPEN_TO_OFFERS": return "Open to Offers";
            case "SEEKING_INTERNSHIP": return "Seeking Internship";
            default: return "Unknown";
        }
    };

    const formatEmploymentStatus = (status: string | null): { label: string; color: string } => {
        switch (status) {
            case "EMPLOYED_FULL_TIME": return { label: "Employed (FT)", color: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-900" };
            case "EMPLOYED_PART_TIME": return { label: "Employed (PT)", color: "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-900" };
            case "UNEMPLOYED": return { label: "Unemployed", color: "text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-900" };
            case "FREELANCING": return { label: "Freelancing", color: "text-purple-700 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950/30 dark:border-purple-900" };
            case "STUDENT": return { label: "Student", color: "text-yellow-700 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950/30 dark:border-yellow-900" };
            case "RECENT_GRADUATE": return { label: "Recent Graduate", color: "text-teal-700 bg-teal-50 border-teal-200 dark:text-teal-400 dark:bg-teal-950/30 dark:border-teal-900" };
            case "BETWEEN_JOBS": return { label: "Between Jobs", color: "text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950/30 dark:border-orange-900" };
            default: return { label: "Status Unknown", color: "text-slate-500 bg-stone-50 border-stone-200 dark:text-slate-400 dark:bg-slate-900 dark:border-slate-800" };
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <PageHeader title="Saved Talent" subtitle="Your bookmarked candidates and talent pools." />

            {loading ? (
                <div className="flex h-40 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[#16324f]" />
                </div>
            ) : saved.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900/50">
                    <Bookmark size={32} className="mb-2 opacity-50" />
                    <p>You haven't saved any candidates yet.</p>
                    <Link href="/dashboard/employer/discover" className="mt-2 text-sm font-semibold text-[#16324f] hover:underline dark:text-blue-400">
                        Go to Discover
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {saved.map(({ seeker, saved_at }) => (
                        <Link key={seeker.id} href={`/dashboard/employer/talent/${seeker.id}`} className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 transition-shadow hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
                            <div>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-stone-100 dark:bg-slate-800">
                                            {seeker.avatar_url ? (
                                                <img src={seeker.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                                            ) : (
                                                <span className="text-lg font-semibold text-[#16324f] dark:text-slate-300">
                                                    {(seeker.full_name || "?")[0].toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="line-clamp-1 font-bold text-slate-900 transition-colors group-hover:text-[#16324f] dark:text-white">
                                                {seeker.full_name}
                                            </h3>
                                            <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-slate-500">
                                                <MapPin size={12} />
                                                {seeker.location || "Location unlisted"}
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => handleUnsave(seeker.id, e)}
                                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                                        title="Remove from saved"
                                    >
                                        <BookmarkMinus size={18} />
                                    </button>
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                    <Badge label={formatIntent(seeker.search_intent)} variant={seeker.search_intent === "SEEKING_INTERNSHIP" ? "yellow" : "blue"} />
                                    {seeker.employment_status && (() => {
                                        const s = formatEmploymentStatus(seeker.employment_status);
                                        return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${s.color}`}>{s.label}</span>;
                                    })()}
                                    {seeker.seniority_level && <Badge label={seeker.seniority_level} variant="secondary" />}
                                </div>

                                <div className="mt-4 flex flex-wrap gap-1.5">
                                    {seeker.skills?.slice(0, 4).map((skill, i) => (
                                        <span key={i} className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                            {skill}
                                        </span>
                                    ))}
                                    {(seeker.skills?.length || 0) > 4 && (
                                        <span className="rounded-lg bg-stone-50 px-2.5 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800/50">
                                            +{seeker.skills.length - 4} more
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4 border-t border-stone-100 pt-3 text-xs text-slate-400 dark:border-slate-800">
                                Saved on {new Date(saved_at).toLocaleDateString()}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
