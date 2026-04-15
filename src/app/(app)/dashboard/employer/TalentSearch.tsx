"use client";

import { useState } from "react";
import { apiFetchJson } from "@/lib/api";
import { Search, Sparkles, Loader2, Lock } from "lucide-react";
import { Badge, SectionCard } from "@/components/dashboard/ui";
import { toast } from "sonner";

interface SearchResult {
    id: string;
    summary: string;
    tier: number;
    skills: string[];
    location: string;
    score: number;
    justification: string;
}

export function TalentSearch({ onResults, isApproved = true }: { onResults: (results: SearchResult[]) => void; isApproved?: boolean }) {
    const [query, setQuery] = useState("");
    const [searching, setSearching] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() || !isApproved) return;

        setSearching(true);
        try {
            const results = await apiFetchJson<SearchResult[]>("/api/employer/talent/search", {
                method: "POST",
                body: JSON.stringify({ query }),
            });
            onResults(results);
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to perform search");
        } finally {
            setSearching(false);
        }
    };

    return (
        <SectionCard title="Talent search">
            <div className="space-y-5 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Sparkles size={16} className="text-[#16324f]" />
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">Describe the kind of candidate you need</p>
                        </div>
                        <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                            Use a short natural-language brief like role, seniority, location, and key skills. Search stays available for approved employers only.
                        </p>
                    </div>
                    <Badge label={isApproved ? "Search active" : "Approval required"} variant={isApproved ? "green" : "yellow"} />
                </div>

                <form onSubmit={handleSearch} className="flex flex-col gap-3 lg:flex-row">
                    <label className="relative flex-1">
                        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            disabled={!isApproved}
                            placeholder={isApproved ? "Example: Accounts lead in Lilongwe with payroll, Excel, and team management experience" : "Search unlocks after employer approval"}
                            className="h-12 w-full rounded-xl border border-stone-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition-colors focus:border-stone-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                    </label>
                    <button
                        type="submit"
                        disabled={searching || !query.trim() || !isApproved}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#16324f] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {searching ? <Loader2 size={16} className="animate-spin" /> : isApproved ? <Sparkles size={16} /> : <Lock size={16} />}
                        {searching ? "Searching" : isApproved ? "Run search" : "Locked"}
                    </button>
                </form>
            </div>
        </SectionCard>
    );
}
