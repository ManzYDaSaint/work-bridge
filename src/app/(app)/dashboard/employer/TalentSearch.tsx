"use client";

import { useState } from "react";
import { apiFetchJson } from "@/lib/api";
import { Search, Sparkles, Loader2, Info, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

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
                body: JSON.stringify({ query })
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
        <div className={cn(
            "rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden group transition-all duration-700",
            isApproved ? "bg-slate-900" : "bg-slate-800 opacity-90 border border-slate-700"
        )}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] group-hover:scale-150 transition-transform duration-1000" />

            <div className="relative z-10 space-y-6">
                <div className="space-y-2">
                    <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                        <Sparkles className={isApproved ? "text-blue-400" : "text-slate-500"} size={24} />
                        Semantic Talent Discovery
                        {!isApproved && <Lock size={16} className="text-amber-500" />}
                    </h3>
                    <p className="text-xs font-medium text-slate-400 max-w-md">
                        {isApproved
                            ? "Don't just filter by keywords. Describe your goal and our AI will rank the best matches."
                            : "Your strategic search engine is warming up. This feature will unlock once your account verification is complete."}
                    </p>
                </div>

                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            disabled={!isApproved}
                            placeholder={isApproved ? "Describe what you are looking for..." : "Verification Pending..."}
                            className={cn(
                                "w-full h-16 bg-white/5 border rounded-2xl px-14 text-white font-bold outline-none transition-all",
                                isApproved
                                    ? "border-white/10 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50"
                                    : "border-slate-700 cursor-not-allowed text-slate-500"
                            )}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={searching || !query.trim() || !isApproved}
                        className={cn(
                            "h-16 px-10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2",
                            searching || !isApproved
                                ? "bg-white/10 text-slate-500 cursor-not-allowed"
                                : "bg-blue-600 text-white hover:bg-white hover:text-slate-900 shadow-xl shadow-blue-500/20"
                        )}
                    >
                        {searching ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                Analyzing...
                            </>
                        ) : (
                            isApproved ? "Explore Talent" : "Locked"
                        )}
                    </button>
                </form>

                <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">
                    <Info size={14} className="text-blue-500/50" />
                    AI will rank candidates based on semantic proficiency and verified credentials.
                </div>
            </div>
        </div>
    );
}
