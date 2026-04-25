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

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <Badge label={formatIntent(seeker.search_intent)} variant={seeker.search_intent === "SEEKING_INTERNSHIP" ? "yellow" : "blue"} />
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
