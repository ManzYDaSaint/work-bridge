"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Filter, MapPin, Briefcase, GraduationCap, Bookmark, CheckCircle } from "lucide-react";
import { PageHeader, Badge } from "@/components/dashboard/ui";
import CandidateDetailDrawer, { ApplicantProfile } from "@/components/dashboard/employer/CandidateDetailDrawer";
import { toggleSaveTalent } from "@/app/(app)/dashboard/employer/actions";

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
    employment_status: string | null;
    search_intent: string;
    profile_visibility: string;
    portfolio_links: string[];
    is_saved?: boolean;
}

export default function DiscoverTalentClient({ 
    initialSeekers, 
    appliedSeekerIds 
}: { 
    initialSeekers: SeekerCard[];
    appliedSeekerIds: string[];
}) {
    const [seekers, setSeekers] = useState<SeekerCard[]>(initialSeekers);
    const [selectedSeekerId, setSelectedSeekerId] = useState<string | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<ApplicantProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);
    
    const [intentFilter, setIntentFilter] = useState("ALL");
    const [seniorityFilter, setSeniorityFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [locationQuery, setLocationQuery] = useState("");
    const [qualificationFilter, setQualificationFilter] = useState("ALL");
    const [hasResumeFilter, setHasResumeFilter] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    
    const router = useRouter();
    const appliedSet = new Set(appliedSeekerIds);

    const handleToggleSave = async (e: React.MouseEvent, seekerId: string, isCurrentlySaved: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        
        try {
            const result = await toggleSaveTalent(seekerId, isCurrentlySaved);
            if (result.success) {
                setSeekers((prev) => 
                    prev.map((s) => s.id === seekerId ? { ...s, is_saved: !isCurrentlySaved } : s)
                );
                toast.success(isCurrentlySaved ? "Removed from saved candidates" : "Saved candidate");
            } else {
                toast.error(result.error || "Failed to update candidate status");
            }
        } catch {
            toast.error("Failed to update candidate status");
        }
    };

    const selectedIsSaved = selectedSeekerId
        ? seekers.find((s) => s.id === selectedSeekerId)?.is_saved ?? false
        : false;

    const openProfile = (id: string) => {
        setSelectedSeekerId(id);
        setSelectedProfile(null);
        setProfileError(null);
    };

    useEffect(() => {
        if (!selectedSeekerId) return;

        setProfileLoading(true);
        setProfileError(null);

        let active = true;
        (async () => {
            try {
                const res = await fetch(`/api/employer/discover/${selectedSeekerId}`);
                if (!active) return;
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Candidate profile not available");
                }
                const data = await res.json();
                if (active) setSelectedProfile(data);
            } catch (err: any) {
                if (active) setProfileError(err.message || "Failed to load candidate details");
            } finally {
                if (active) setProfileLoading(false);
            }
        })();

        return () => {
            active = false;
        };
    }, [selectedSeekerId]);

    const updateFilters = () => {
        const params = new URLSearchParams();
        if (intentFilter !== "ALL") params.append("intent", intentFilter);
        if (seniorityFilter !== "ALL") params.append("seniority", seniorityFilter);
        if (statusFilter !== "ALL") params.append("status", statusFilter);
        if (locationQuery.trim()) params.append("location", locationQuery.trim());
        if (qualificationFilter !== "ALL") params.append("qualification", qualificationFilter);
        if (hasResumeFilter) params.append("hasResume", "true");
        if (searchQuery) params.append("skills", searchQuery.split(" ").join(","));
        
        router.push(`/dashboard/employer/discover?${params.toString()}`);
    };

    const formatIntent = (intent: string) => {
        switch (intent) {
            case "ACTIVELY_LOOKING": return "Actively Looking";
            case "OPEN_TO_OFFERS": return "Open to Offers";
            case "SEEKING_INTERNSHIP": return "Seeking Internship";
            case "NOT_LOOKING": return "Not Looking";
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
                                <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">Search Keywords & Skills</label>
                                <div className="relative">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Name, Bio, or Skills" 
                                        className="w-full rounded-xl border border-stone-200 bg-stone-50 pl-9 pr-3 py-2 text-sm outline-none focus:border-stone-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && updateFilters()}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">Location</label>
                                <div className="relative">
                                    <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Lilongwe, Blantyre" 
                                        className="w-full rounded-xl border border-stone-200 bg-stone-50 pl-9 pr-3 py-2 text-sm outline-none focus:border-stone-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                        value={locationQuery}
                                        onChange={(e) => setLocationQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && updateFilters()}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">Candidate Intent</label>
                                <select 
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                    value={intentFilter}
                                    onChange={(e) => {
                                        setIntentFilter(e.target.value);
                                        // Trigger update on change for selects
                                        setTimeout(() => {
                                            const params = new URLSearchParams();
                                            if (e.target.value !== "ALL") params.append("intent", e.target.value);
                                            if (seniorityFilter !== "ALL") params.append("seniority", seniorityFilter);
                                            if (statusFilter !== "ALL") params.append("status", statusFilter);
                                            if (locationQuery.trim()) params.append("location", locationQuery.trim());
                                            if (qualificationFilter !== "ALL") params.append("qualification", qualificationFilter);
                                            if (hasResumeFilter) params.append("hasResume", "true");
                                            if (searchQuery) params.append("skills", searchQuery.split(" ").join(","));
                                            router.push(`/dashboard/employer/discover?${params.toString()}`);
                                        }, 0);
                                    }}
                                >
                                    <option value="ALL">All Candidates</option>
                                    <option value="ACTIVELY_LOOKING">Actively Looking</option>
                                    <option value="OPEN_TO_OFFERS">Open to Offers</option>
                                    <option value="SEEKING_INTERNSHIP">Seeking Internship</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">Employment Status</label>
                                <select 
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                    value={statusFilter}
                                    onChange={(e) => {
                                        setStatusFilter(e.target.value);
                                        setTimeout(() => {
                                            const params = new URLSearchParams();
                                            if (intentFilter !== "ALL") params.append("intent", intentFilter);
                                            if (seniorityFilter !== "ALL") params.append("seniority", seniorityFilter);
                                            if (e.target.value !== "ALL") params.append("status", e.target.value);
                                            if (locationQuery.trim()) params.append("location", locationQuery.trim());
                                            if (qualificationFilter !== "ALL") params.append("qualification", qualificationFilter);
                                            if (hasResumeFilter) params.append("hasResume", "true");
                                            if (searchQuery) params.append("skills", searchQuery.split(" ").join(","));
                                            router.push(`/dashboard/employer/discover?${params.toString()}`);
                                        }, 0);
                                    }}
                                >
                                    <option value="ALL">All Statuses</option>
                                    <option value="EMPLOYED_FULL_TIME">Employed (Full-time)</option>
                                    <option value="EMPLOYED_PART_TIME">Employed (Part-time)</option>
                                    <option value="UNEMPLOYED">Not Currently Employed</option>
                                    <option value="FREELANCING">Freelancing / Self-employed</option>
                                    <option value="STUDENT">Student</option>
                                    <option value="RECENT_GRADUATE">Recent Graduate</option>
                                    <option value="BETWEEN_JOBS">Between Jobs</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">Seniority</label>
                                <select 
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                    value={seniorityFilter}
                                    onChange={(e) => {
                                        setSeniorityFilter(e.target.value);
                                        setTimeout(() => {
                                            const params = new URLSearchParams();
                                            if (intentFilter !== "ALL") params.append("intent", intentFilter);
                                            if (e.target.value !== "ALL") params.append("seniority", e.target.value);
                                            if (statusFilter !== "ALL") params.append("status", statusFilter);
                                            if (locationQuery.trim()) params.append("location", locationQuery.trim());
                                            if (qualificationFilter !== "ALL") params.append("qualification", qualificationFilter);
                                            if (hasResumeFilter) params.append("hasResume", "true");
                                            if (searchQuery) params.append("skills", searchQuery.split(" ").join(","));
                                            router.push(`/dashboard/employer/discover?${params.toString()}`);
                                        }, 0);
                                    }}
                                >
                                    <option value="ALL">All Levels</option>
                                    <option value="Intern">Intern</option>
                                    <option value="Junior">Junior</option>
                                    <option value="Mid-Level">Mid-Level</option>
                                    <option value="Senior">Senior</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">Qualification</label>
                                <select 
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                    value={qualificationFilter}
                                    onChange={(e) => {
                                        setQualificationFilter(e.target.value);
                                        setTimeout(() => {
                                            const params = new URLSearchParams();
                                            if (intentFilter !== "ALL") params.append("intent", intentFilter);
                                            if (seniorityFilter !== "ALL") params.append("seniority", seniorityFilter);
                                            if (statusFilter !== "ALL") params.append("status", statusFilter);
                                            if (locationQuery.trim()) params.append("location", locationQuery.trim());
                                            if (e.target.value !== "ALL") params.append("qualification", e.target.value);
                                            if (hasResumeFilter) params.append("hasResume", "true");
                                            if (searchQuery) params.append("skills", searchQuery.split(" ").join(","));
                                            router.push(`/dashboard/employer/discover?${params.toString()}`);
                                        }, 0);
                                    }}
                                >
                                    <option value="ALL">All Qualifications</option>
                                    <option value="Cert">Certificate</option>
                                    <option value="Dip">Diploma</option>
                                    <option value="Degree">Degree / Bachelor's</option>
                                    <option value="Master">Master's Degree</option>
                                    <option value="PhD">Doctorate / PhD</option>
                                </select>
                            </div>

                            <div className="pt-2">
                                <label className="flex items-center gap-2.5 cursor-pointer select-none text-sm font-medium text-slate-700 dark:text-slate-300">
                                    <input 
                                        type="checkbox" 
                                        className="h-4 w-4 rounded border-stone-300 text-[#16324f] focus:ring-[#16324f] dark:border-slate-700 dark:bg-slate-950"
                                        checked={hasResumeFilter}
                                        onChange={(e) => {
                                            setHasResumeFilter(e.target.checked);
                                            setTimeout(() => {
                                                const params = new URLSearchParams();
                                                if (intentFilter !== "ALL") params.append("intent", intentFilter);
                                                if (seniorityFilter !== "ALL") params.append("seniority", seniorityFilter);
                                                if (statusFilter !== "ALL") params.append("status", statusFilter);
                                                if (locationQuery.trim()) params.append("location", locationQuery.trim());
                                                if (qualificationFilter !== "ALL") params.append("qualification", qualificationFilter);
                                                if (e.target.checked) params.append("hasResume", "true");
                                                if (searchQuery) params.append("skills", searchQuery.split(" ").join(","));
                                                router.push(`/dashboard/employer/discover?${params.toString()}`);
                                            }, 0);
                                        }}
                                    />
                                    <span>Has uploaded resume</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Results Grid */}
                <div className="lg:col-span-3">
                    {seekers.length === 0 ? (
                        <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900/50">
                            <Search size={32} className="mb-2 opacity-50" />
                            <p>No candidates found matching your criteria.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2">
                            {seekers.map((seeker) => (
                                <div
                                    key={seeker.id}
                                    onClick={() => openProfile(seeker.id)}
                                    role="button"
                                    className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 transition-shadow hover:shadow-md hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                                >
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
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={(e) => handleToggleSave(e, seeker.id, !!seeker.is_saved)}
                                                    className="rounded-xl border border-stone-200 p-2 hover:bg-stone-50 dark:border-slate-800 dark:hover:bg-slate-800 transition-colors"
                                                    title={seeker.is_saved ? "Remove from saved candidates" : "Save candidate"}
                                                >
                                                    <Bookmark size={15} className={seeker.is_saved ? "fill-[#16324f] text-[#16324f]" : "text-slate-400"} />
                                                </button>
                                            <div className="flex flex-col items-end gap-1.5">
                                                    <Badge 
                                                        label={formatIntent(seeker.search_intent)} 
                                                        variant={seeker.search_intent === "SEEKING_INTERNSHIP" ? "yellow" : "blue"} 
                                                    />
                                                    {seeker.employment_status && (() => {
                                                        const s = formatEmploymentStatus(seeker.employment_status);
                                                        return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${s.color}`}>{s.label}</span>;
                                                    })()}
                                                    {appliedSet.has(seeker.id) && (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400">
                                                            <CheckCircle size={10} /> Applied
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
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
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <CandidateDetailDrawer
                open={!!selectedSeekerId}
                profile={selectedProfile}
                loading={profileLoading}
                error={profileError}
                isSaved={selectedIsSaved}
                onClose={() => setSelectedSeekerId(null)}
                onToggleSave={(e) => {
                    if (!selectedProfile) return;
                    handleToggleSave(e, selectedProfile.id, selectedIsSaved);
                }}
            />
        </div>
    );
}
