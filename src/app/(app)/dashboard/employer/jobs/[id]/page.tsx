"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
    Loader2, ChevronLeft, MapPin, Briefcase, Users, Sparkles,
    Calendar, ExternalLink, Clock, Send
} from "lucide-react";
import { Badge, SectionCard } from "@/components/dashboard/ui";
import Link from "next/link";
import { toast } from "sonner";

interface JobDetail {
    id: string;
    title: string;
    description: string;
    location: string;
    type: string;
    work_mode: string;
    skills: string[];
    must_have_skills: string[];
    salary_range: string | null;
    deadline: string | null;
    status: string;
    created_at: string;
    employer_id: string;
    employers?: { company_name: string; logo_url: string | null };
}

interface MatchedCandidate {
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
}

type Tab = "overview" | "candidates";

export default function JobDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [job, setJob] = useState<JobDetail | null>(null);
    const [matches, setMatches] = useState<MatchedCandidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [matchesLoading, setMatchesLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>("overview");
    const [invitingId, setInvitingId] = useState<string | null>(null);

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const res = await apiFetch(`/api/jobs/${params.id}`);
                if (res.ok) {
                    setJob(await res.json());
                } else {
                    router.back();
                }
            } finally {
                setLoading(false);
            }
        };
        fetchJob();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id]);

    const fetchMatches = async () => {
        if (matches.length > 0) return; // already loaded
        setMatchesLoading(true);
        try {
            const res = await apiFetch(`/api/employer/jobs/${params.id}/matches`);
            if (res.ok) {
                const data = await res.json();
                setMatches(data.matches || []);
            }
        } finally {
            setMatchesLoading(false);
        }
    };

    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
        if (tab === "candidates") fetchMatches();
    };

    const handleQuickInvite = async (seekerId: string) => {
        setInvitingId(seekerId);
        try {
            await apiFetch("/api/employer/messages/invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ seeker_id: seekerId, job_id: params.id }),
            });
            toast.success("Invite sent!");
        } catch {
            toast.error("Failed to send invite");
        } finally {
            setInvitingId(null);
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

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#16324f]" />
            </div>
        );
    }

    if (!job) return null;

    const allSkills = [...new Set([...(job.skills || []), ...(job.must_have_skills || [])])];

    return (
        <div className="space-y-6 pb-20">
            {/* Back button */}
            <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
                <ChevronLeft size={16} /> Back to Jobs
            </button>

            {/* Job Header */}
            <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8">
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">
                            {job.title}
                        </h1>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1.5"><MapPin size={14} />{job.location}</span>
                            <span className="flex items-center gap-1.5"><Briefcase size={14} />{job.type?.replace(/_/g, " ")}</span>
                            {job.work_mode && <Badge label={job.work_mode.replace(/_/g, " ")} variant="secondary" />}
                        </div>
                        {job.deadline && (
                            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                                <Calendar size={12} />
                                Deadline: {new Date(job.deadline).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge
                            label={job.status}
                            variant={job.status === "ACTIVE" ? "green" : job.status === "FILLED" ? "blue" : "slate"}
                        />
                        <Link
                            href={`/dashboard/employer/jobs/${job.id}/edit`}
                            className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            Edit Role
                        </Link>
                        <Link
                            href={`/jobs/${job.id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-300"
                        >
                            Public Listing <ExternalLink size={14} />
                        </Link>
                        <Link
                            href={`/dashboard/employer/candidates?jobId=${job.id}`}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#16324f] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                        >
                            <Users size={14} /> View Pipeline
                        </Link>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 rounded-2xl border border-stone-200 bg-stone-50 p-1 dark:border-slate-800 dark:bg-slate-900/50">
                {([
                    { id: "overview", label: "Job Overview" },
                    { id: "candidates", label: "✨ Suggested Candidates" },
                ] as { id: Tab; label: string }[]).map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${activeTab === tab.id
                            ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                            : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === "overview" && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="space-y-6 md:col-span-2">
                        <SectionCard title="Job Description">
                            <div className="p-6">
                                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                                    {job.description || "No description provided."}
                                </p>
                            </div>
                        </SectionCard>
                    </div>

                    <div className="space-y-6">
                        <SectionCard title="Required Skills">
                            <div className="p-5">
                                {allSkills.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {allSkills.map((skill, i) => (
                                            <span
                                                key={i}
                                                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${(job.must_have_skills || []).includes(skill)
                                                    ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                                                    : "bg-stone-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                                    }`}
                                            >
                                                {skill}
                                                {(job.must_have_skills || []).includes(skill) && " *"}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500">No skills listed.</p>
                                )}
                                {job.must_have_skills?.length > 0 && (
                                    <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">* Must-have skills</p>
                                )}
                            </div>
                        </SectionCard>

                        {job.salary_range && (
                            <SectionCard title="Salary Range">
                                <div className="p-5">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{job.salary_range}</p>
                                </div>
                            </SectionCard>
                        )}

                        <SectionCard title="Posted">
                            <div className="p-5">
                                <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                    <Clock size={14} />
                                    {new Date(job.created_at).toLocaleDateString("en-GB", {
                                        day: "numeric", month: "long", year: "numeric"
                                    })}
                                </p>
                            </div>
                        </SectionCard>
                    </div>
                </div>
            )}

            {activeTab === "candidates" && (
                <div className="space-y-4">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 dark:border-blue-900/30 dark:bg-blue-950/20">
                        <div className="flex items-start gap-3">
                            <Sparkles size={18} className="mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                            <div>
                                <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">Skill-Based Matches</p>
                                <p className="mt-0.5 text-sm text-blue-700 dark:text-blue-400">
                                    These candidates have skills that match your job requirements and have set their profile to public or anonymous.
                                    Click a candidate to view their full profile, or send a quick invite below.
                                </p>
                            </div>
                        </div>
                    </div>

                    {matchesLoading ? (
                        <div className="flex h-40 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-[#16324f]" />
                        </div>
                    ) : matches.length === 0 ? (
                        <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 dark:border-slate-700 dark:bg-slate-900/50">
                            <Sparkles size={32} className="mb-3 text-slate-300 dark:text-slate-600" />
                            <p className="font-semibold text-slate-700 dark:text-slate-300">No matches found yet</p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Add skill tags to this job to find matching candidates.
                            </p>
                            <Link
                                href={`/dashboard/employer/jobs/${job.id}/edit`}
                                className="mt-3 text-sm font-semibold text-[#16324f] hover:underline dark:text-blue-400"
                            >
                                Edit job skills
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {matches.map((candidate) => {
                                // Find overlapping skills for this job
                                const matchedSkills = (candidate.skills || []).filter(s =>
                                    allSkills.map(js => js.toLowerCase()).includes(s.toLowerCase())
                                );
                                return (
                                    <div
                                        key={candidate.id}
                                        className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-stone-100 dark:bg-slate-800">
                                                        {candidate.avatar_url ? (
                                                            <img src={candidate.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                                                        ) : (
                                                            <span className="text-base font-semibold text-[#16324f] dark:text-slate-300">
                                                                {(candidate.full_name || "?")[0].toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate font-bold text-slate-900 dark:text-white">
                                                            {candidate.full_name}
                                                        </p>
                                                        {candidate.location && (
                                                            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                                                <MapPin size={11} />{candidate.location}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <Badge
                                                    label={formatIntent(candidate.search_intent)}
                                                    variant={candidate.search_intent === "SEEKING_INTERNSHIP" ? "orange" : "blue"}
                                                    className="flex-shrink-0 text-[10px]"
                                                />
                                            </div>

                                            {/* Matched skills */}
                                            {matchedSkills.length > 0 && (
                                                <div className="mt-3">
                                                    <p className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                        {matchedSkills.length} matching skill{matchedSkills.length > 1 ? "s" : ""}
                                                    </p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {matchedSkills.slice(0, 4).map((skill, i) => (
                                                            <span key={i} className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                        {matchedSkills.length > 4 && (
                                                            <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800">
                                                                +{matchedSkills.length - 4}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-4 flex items-center gap-2 border-t border-stone-100 pt-4 dark:border-slate-800">
                                            <Link
                                                href={`/dashboard/employer/talent/${candidate.id}`}
                                                className="flex-1 rounded-xl border border-stone-200 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                            >
                                                View Profile
                                            </Link>
                                            <button
                                                onClick={() => handleQuickInvite(candidate.id)}
                                                disabled={invitingId === candidate.id}
                                                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#16324f] py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                                            >
                                                {invitingId === candidate.id ? (
                                                    <Loader2 size={13} className="animate-spin" />
                                                ) : (
                                                    <Send size={13} />
                                                )}
                                                Invite
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
