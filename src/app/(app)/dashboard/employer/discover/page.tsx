"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Loader2, Search, Filter, MapPin, Briefcase, GraduationCap } from "lucide-react";
import { PageHeader, Badge } from "@/components/dashboard/ui";
import Link from "next/link";

interface SeekerCard {
    id: string;
    full_name: string;
    bio: string | null;
    location: string | null;
    skills: string[];
    experience: any[];
    education: any[];
    qualification: string | null;
    avatar_url: string | null;
    seniority_level: string | null;
    employment_type: string | null;
    search_intent: string;
    profile_visibility: string;
    portfolio_links: string[];
}

export default function DiscoverTalentPage() {
    const [seekers, setSeekers] = useState<SeekerCard[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [intentFilter, setIntentFilter] = useState("ALL");
    const [seniorityFilter, setSeniorityFilter] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");

    const fetchSeekers = useCallback(async () => {
        setLoading(true);
        try {
            // Basic search via skills or text could be implemented here
            const params = new URLSearchParams();
            if (intentFilter !== "ALL") params.append("intent", intentFilter);
            if (seniorityFilter !== "ALL") params.append("seniority", seniorityFilter);
            if (searchQuery) params.append("skills", searchQuery.split(" ").join(","));

            const res = await apiFetch(`/api/employer/discover?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setSeekers(data.seekers || []);
            }
        } finally {
            setLoading(false);
        }
    }, [intentFilter, seniorityFilter, searchQuery]);

    useEffect(() => {
        // debounce fetch when search query changes
        const timeoutId = setTimeout(() => {
            fetchSeekers();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [fetchSeekers]);

    const formatIntent = (intent: string) => {
        switch (intent) {
            case "ACTIVELY_LOOKING": return "Actively Looking";
            case "OPEN_TO_OFFERS": return "Open to Offers";
            case "SEEKING_INTERNSHIP": return "Seeking Internship";
            case "NOT_LOOKING": return "Not Looking";
            default: return "Unknown";
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <PageHeader title="Discover Talent" subtitle="Proactively find students, interns, and professionals for your roles." />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                {/* Sidebar Filters */}
                <div className="space-y-6 lg:col-span-1">
                    <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                        <div className="mb-4 flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                            <Filter size={18} />
                            Filters
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">Search Skills</label>
                                <div className="relative">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="e.g. React, Java, Marketing" 
                                        className="w-full rounded-xl border border-stone-200 bg-stone-50 pl-9 pr-3 py-2 text-sm outline-none focus:border-stone-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">Candidate Intent</label>
                                <select 
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                    value={intentFilter}
                                    onChange={(e) => setIntentFilter(e.target.value)}
                                >
                                    <option value="ALL">All Candidates</option>
                                    <option value="ACTIVELY_LOOKING">Actively Looking</option>
                                    <option value="OPEN_TO_OFFERS">Open to Offers</option>
                                    <option value="SEEKING_INTERNSHIP">Seeking Internship</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">Seniority</label>
                                <select 
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                    value={seniorityFilter}
                                    onChange={(e) => setSeniorityFilter(e.target.value)}
                                >
                                    <option value="ALL">All Levels</option>
                                    <option value="Intern">Intern</option>
                                    <option value="Junior">Junior</option>
                                    <option value="Mid-Level">Mid-Level</option>
                                    <option value="Senior">Senior</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Results Grid */}
                <div className="lg:col-span-3">
                    {loading ? (
                        <div className="flex h-40 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-[#16324f]" />
                        </div>
                    ) : seekers.length === 0 ? (
                        <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900/50">
                            <Search size={32} className="mb-2 opacity-50" />
                            <p>No candidates found matching your criteria.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2">
                            {seekers.map((seeker) => (
                                <Link key={seeker.id} href={`/dashboard/employer/talent/${seeker.id}`} className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 transition-shadow hover:shadow-md hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
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
                                                    <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-[#16324f] transition-colors">
                                                        {seeker.full_name}
                                                    </h3>
                                                    <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                                                        <MapPin size={12} />
                                                        {seeker.location || "Location unlisted"}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge 
                                                label={formatIntent(seeker.search_intent)} 
                                                variant={seeker.search_intent === "SEEKING_INTERNSHIP" ? "yellow" : "blue"} 
                                                className="shrink-0"
                                            />
                                        </div>

                                        {seeker.bio && (
                                            <p className="mt-4 text-sm text-slate-600 line-clamp-2 dark:text-slate-300">
                                                {seeker.bio}
                                            </p>
                                        )}

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
                                        
                                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
                                            {seeker.seniority_level && (
                                                <div className="flex items-center gap-1.5">
                                                    <Briefcase size={14} className="opacity-70" />
                                                    {seeker.seniority_level}
                                                </div>
                                            )}
                                            {seeker.qualification && (
                                                <div className="flex items-center gap-1.5 line-clamp-1">
                                                    <GraduationCap size={14} className="opacity-70" />
                                                    {seeker.qualification}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
