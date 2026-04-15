"use client";

import { AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, apiFetchJson } from "@/lib/api";
import { useUser } from "@/context/UserContext";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";
import { cn, formatJobType, formatWorkMode, timeAgo } from "@/lib/utils";
import { ArrowUpRight, Bookmark, BookmarkCheck, Briefcase, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { Pagination, CompanyAvatar } from "@/components/dashboard/ui";
import JobDetailModal, { type PublicViewerMode } from "./JobDetailModal";
import { toast } from "sonner";
import type { Job, ScreeningAnswer } from "@/types";

type ExtendedJob = Omit<Job, "employer"> & {
    employer: {
        companyName?: string;
        id?: string;
        logoUrl?: string | null;
        industry?: string | null;
        website?: string | null;
        location?: string | null;
        recruiterVerified?: boolean;
    } | null;
};

type MeProfile = {
    role: string;
    jobSeeker?: {
        completion?: number;
        isSubscribed?: boolean;
        applicationsThisMonth?: number;
        skills?: string[];
        preferredWorkModes?: string[];
        preferredJobTypes?: string[];
        preferredLocations?: string[];
        preferredSkills?: string[];
    };
};

const WORK_MODES = ["REMOTE", "HYBRID", "ON_SITE"] as const;

function FilterPill({
    active,
    label,
    onClick,
}: {
    active: boolean;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                    ? "border-[#16324f] bg-[#16324f] text-white dark:border-white dark:bg-white dark:text-slate-900"
                    : "border-stone-200 bg-white/80 text-slate-600 hover:border-stone-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            )}
        >
            {label}
        </button>
    );
}

function JobListRow({
    job,
    isSaved,
    isApplied,
    onOpen,
    onToggleSave,
}: {
    job: ExtendedJob;
    isSaved: boolean;
    isApplied: boolean;
    onOpen: () => void;
    onToggleSave: () => void;
}) {
    const company = job.employer?.companyName || "Independent team";

    return (
        <div className="grid grid-cols-1 gap-y-4 border-b border-stone-200/70 px-4 py-4 transition-colors hover:bg-stone-50/70 dark:border-slate-800 dark:hover:bg-slate-900/60 sm:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
            <button type="button" onClick={onOpen} className="min-w-0 text-left">
                <div className="flex items-start gap-3">
                    <CompanyAvatar logoUrl={job.employer?.logoUrl} name={company} size="sm" />
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-white sm:text-base">{job.title}</h2>
                            {isApplied && (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                    Applied
                                </span>
                            )}
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            <span className="font-medium text-slate-700 dark:text-slate-300">{company}</span>
                            <span className="mx-2 text-stone-300 dark:text-slate-700">/</span>
                            {job.location}
                        </p>
                    </div>
                </div>
            </button>

            <button type="button" onClick={onOpen} className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-left">
                <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[10px] sm:text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {formatWorkMode(job.work_mode)}
                </span>
                <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[10px] sm:text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {formatJobType(job.type)}
                </span>
                {job.salary_range && (
                    <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[10px] sm:text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {job.salary_range}
                    </span>
                )}
            </button>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span className="text-[11px] sm:text-xs text-slate-400">{timeAgo(job.createdAt) || "Recently"}</span>
                <button
                    type="button"
                    onClick={onToggleSave}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-slate-500 transition-colors hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
                    aria-label={isSaved ? "Unsave job" : "Save job"}
                >
                    {isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                </button>
            </div>
        </div>
    );
}

export default function PublicJobBoard() {
    const [jobs, setJobs] = useState<ExtendedJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState<ExtendedJob | null>(null);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedWorkMode, setSelectedWorkMode] = useState<string>("ALL");
    const [selectedType, setSelectedType] = useState<string>("ALL");
    const [filtersOpen, setFiltersOpen] = useState(false);

    const { user, refreshUser } = useUser();
    const [isSavingPrefs, setIsSavingPrefs] = useState(false);
    const [isSlowNetwork, setIsSlowNetwork] = useState(false);
    const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
    const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());

    // Sync context user data to local state for filters/matching reasons
    const profileCompletion = user?.jobSeeker?.completion ?? 0;
    const isSubscribed = user?.jobSeeker?.isSubscribed ?? false;
    const applicationsThisMonth = user?.jobSeeker?.applicationsThisMonth ?? 0;
    const seekerSkills = user?.jobSeeker?.skills || [];
    const preferredWorkModesContext = user?.jobSeeker?.preferredWorkModes || [];
    const preferredJobTypesContext = user?.jobSeeker?.preferredJobTypes || [];
    const preferredLocationsContext = user?.jobSeeker?.preferredLocations || [];
    const preferredSkillsContext = user?.jobSeeker?.preferredSkills || [];

    const [preferredWorkModes, setPreferredWorkModes] = useState<string[]>([]);
    const [preferredJobTypes, setPreferredJobTypes] = useState<string[]>([]);
    const [preferredLocationsInput, setPreferredLocationsInput] = useState("");
    const [preferredSkillsInput, setPreferredSkillsInput] = useState("");

    useEffect(() => {
        if (user?.jobSeeker) {
            setPreferredWorkModes(preferredWorkModesContext);
            setPreferredJobTypes(preferredJobTypesContext);
            setPreferredLocationsInput(preferredLocationsContext.join(", "));
            setPreferredSkillsInput(preferredSkillsContext.join(", "));
        }
    }, [user?.id]);

    const searchParams = useSearchParams();
    const router = useRouter();
    const pageRef = useRef(currentPage);
    const lastFetchKeyRef = useRef<string>("");

    useEffect(() => {
        pageRef.current = currentPage;
    }, [currentPage]);

    const fetchData = async (page: number, q?: string, workMode?: string, type?: string) => {
        setLoading(true);
        setIsSlowNetwork(false);
        const slowTimer = setTimeout(() => setIsSlowNetwork(true), 1200);
        try {
            // We NO LONGER fetch /api/me here as it is handled by UserContext

            const qs = new URLSearchParams({
                page: String(page),
                limit: "20",
            });
            if (q) qs.set("query", q);
            if (workMode && workMode !== "ALL") qs.set("workMode", workMode);
            if (type && type !== "ALL") qs.set("type", type);

            const jobsRes = await apiFetch(`/api/jobs?${qs.toString()}`);
            if (jobsRes.ok) {
                const data = await jobsRes.json();
                setJobs(data.jobs || []);
                setTotalPages(data.totalPages || 1);
            }

            // Fetch saved jobs and applications if user is a seeker
            if (user?.role === "JOB_SEEKER" || user?.role === "SEEKER") {
                const [savedRes, appsRes] = await Promise.all([
                    apiFetch("/api/seeker/saved-jobs"),
                    apiFetch("/api/applications"),
                ]);
                if (savedRes.ok) {
                    const saved = await savedRes.json();
                    setSavedJobIds(new Set(saved.map((s: { job_id: string }) => s.job_id)));
                }
                if (appsRes.ok) {
                    const apps = await appsRes.json();
                    setAppliedJobIds(new Set(apps.map((a: { jobId: string }) => a.jobId)));
                }
            } else {
                setSavedJobIds(new Set());
                setAppliedJobIds(new Set());
            }
        } catch (error) {
            console.error("fetchData error:", error);
        } finally {
            clearTimeout(slowTimer);
            setLoading(false);
            setIsSlowNetwork(false);
        }
    };

    useEffect(() => {
        const q = searchParams.get("query") || "";
        const workMode = searchParams.get("workMode") || "ALL";
        const type = searchParams.get("type") || "ALL";
        const fetchKey = `${currentPage}|${q}|${workMode}|${type}`;
        if (lastFetchKeyRef.current === fetchKey) return;
        lastFetchKeyRef.current = fetchKey;
        setSearch(q);
        setSelectedWorkMode(workMode);
        setSelectedType(type);
        // On initial mount or search param change, we fetch everything including profile
        fetchData(currentPage, q || undefined, workMode, type);
    }, [currentPage, searchParams]);

    useEffect(() => {
        const supabase = createBrowserSupabaseClient();
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event) => {
            // Only re-fetch if auth state actually changes (login/logout/token refresh)
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
                const q = searchParams.get("query") || "";
                fetchData(pageRef.current, q || undefined, selectedWorkMode, selectedType);
            }
        });
        return () => subscription.unsubscribe();
    }, []); // Removed dependencies that cause redundant triggers

    const pushFilters = (next: { query?: string; workMode?: string; type?: string }) => {
        const qs = new URLSearchParams();
        if (next.query) qs.set("query", next.query);
        if (next.workMode && next.workMode !== "ALL") qs.set("workMode", next.workMode);
        if (next.type && next.type !== "ALL") qs.set("type", next.type);
        setCurrentPage(1);
        router.push(qs.toString() ? `/jobs?${qs.toString()}` : "/jobs");
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        pushFilters({ query: search.trim() || undefined, workMode: selectedWorkMode, type: selectedType });
    };

    const handleApply = async (jobId: string, screeningAnswers?: Record<string, ScreeningAnswer>) => {
        if (profileCompletion < 60) {
            toast.error("Complete your profile (at least 60%) before applying.");
            return;
        }
        try {
            const res = await apiFetch(`/api/jobs/${jobId}/apply`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ screeningAnswers: screeningAnswers || {} }),
            });
            if (res.ok) {
                setAppliedJobIds((prev) => new Set([...prev, jobId]));
                router.refresh();
                toast.success("Application sent.");
                apiFetch("/api/metrics/track", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ eventName: "application_submitted", stage: "apply", role: "JOB_SEEKER", metadata: { jobId } }),
                }).catch(() => undefined);
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to apply");
            }
        } catch {
            toast.error("An error occurred.");
        }
    };

    const handleToggleSave = async (jobId: string) => {
        if (user?.role !== "JOB_SEEKER" && user?.role !== "SEEKER") {
            router.push("/login");
            return;
        }
        try {
            const data = await apiFetchJson<{ saved: boolean }>("/api/seeker/saved-jobs", {
                method: "POST",
                body: JSON.stringify({ jobId }),
            });

            setSavedJobIds((prev) => {
                const next = new Set(prev);
                if (data.saved) next.add(jobId);
                else next.delete(jobId);
                return next;
            });
            router.refresh();

            if (data.saved) toast.success("Job bookmarked.");
            else toast.success("Bookmark removed.");
        } catch (error: any) {
            toast.error(error.message || "Could not update saved jobs.");
        }
    };

    const typeOptions = useMemo(() => {
        const set = new Set<string>();
        jobs.forEach((job) => {
            if (job.type) set.add(job.type);
        });
        return Array.from(set);
    }, [jobs]);

    const parseCsv = (value: string) =>
        value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);

    const savePreferences = async () => {
        setIsSavingPrefs(true);
        try {
            await apiFetch("/api/seeker/preferences", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    preferredWorkModes,
                    preferredJobTypes,
                    preferredLocations: parseCsv(preferredLocationsInput),
                    preferredSkills: parseCsv(preferredSkillsInput),
                }),
            });
            toast.success("Preferences saved");
            refreshUser();
        } catch {
            toast.error("Could not save preferences");
        } finally {
            setIsSavingPrefs(false);
        }
    };

    const getMatchReason = (job: ExtendedJob) => {
        const reasons: string[] = [];
        const preferredSkills = parseCsv(preferredSkillsInput).map((skill) => skill.toLowerCase());
        const seekerSkillSet = new Set(seekerSkills.map((skill) => skill.toLowerCase()));
        const jobSkills = (job.skills || []).map((skill) => skill.toLowerCase());
        const matchedProfileSkills = jobSkills.filter((skill) => seekerSkillSet.has(skill)).length;
        const matchedPreferenceSkills = jobSkills.filter((skill) => preferredSkills.includes(skill)).length;

        if (matchedProfileSkills > 0) reasons.push(`${matchedProfileSkills} skill match${matchedProfileSkills === 1 ? "" : "es"}`);
        if (preferredWorkModes.includes(String(job.work_mode || ""))) reasons.push(`matches preferred ${formatWorkMode(String(job.work_mode || ""))}`);
        if (preferredJobTypes.includes(String(job.type || ""))) reasons.push(`preferred ${formatJobType(String(job.type || ""))} role`);
        if (matchedPreferenceSkills > 0) reasons.push(`aligned with your target skills`);

        if (reasons.length === 0) return "New role in your feed";
        return reasons.slice(0, 2).join(" • ");
    };

    const handleReportEmployer = async (job: ExtendedJob) => {
        try {
            const res = await apiFetch("/api/trust/report", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    targetUserId: job.employer?.id || null,
                    contextType: "job",
                    contextId: job.id,
                    reason: "Suspicious job posting",
                }),
            });
            if (res.ok) toast.success("Report sent. Our trust team will review.");
            else toast.error("Could not submit report");
        } catch {
            toast.error("Could not submit report");
        }
    };

    const subtitle = selectedWorkMode === "ALL" ? "Remote, hybrid, and on-site jobs" : formatWorkMode(selectedWorkMode);
    const isSeeker = user?.role === "JOB_SEEKER" || user?.role === "SEEKER";

    const publicViewerMode: PublicViewerMode = useMemo(() => {
        if (isSeeker) return "guest";
        if (user?.role === "EMPLOYER") return "employer";
        if (user?.role === "ADMIN") return "admin";
        return "guest";
    }, [isSeeker, user?.role]);

    return (
        <div className="">
            <section className="rounded-2xl border border-stone-200/80 px-5 py-6 shadow-[0_24px_80px_-50px_rgba(17,24,39,0.45)] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70 sm:px-7">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a65a2e]">The board</p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                            Jobs without the noise.
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
                            Fast listings for serious teams hiring in Malawi, across Africa, and remotely around the world.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                        <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Scope</p>
                            <p className="mt-1 font-medium text-slate-900 dark:text-white">{subtitle}</p>
                        </div>
                        <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">This page</p>
                            <p className="mt-1 font-medium text-slate-900 dark:text-white">{jobs.length} listings</p>
                        </div>
                        <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Home base</p>
                            <p className="mt-1 font-medium text-slate-900 dark:text-white">Malawi</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 lg:flex-row">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search roles, companies, or locations"
                            className="w-full rounded-2xl border border-stone-200 bg-white px-12 py-3 text-sm text-slate-900 outline-none transition focus:border-stone-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => setFiltersOpen((prev) => !prev)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 lg:hidden"
                    >
                        <SlidersHorizontal size={16} />
                        Filters
                    </button>
                    <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-2xl bg-[#16324f] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
                    >
                        Search
                    </button>
                </form>

                <div className={cn("mt-5 space-y-4", filtersOpen ? "block" : "hidden lg:block")}>
                    <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Work mode</p>
                        <div className="flex flex-wrap gap-2">
                            <FilterPill active={selectedWorkMode === "ALL"} label="All" onClick={() => pushFilters({ query: search || undefined, workMode: "ALL", type: selectedType })} />
                            {WORK_MODES.map((mode) => (
                                <FilterPill
                                    key={mode}
                                    active={selectedWorkMode === mode}
                                    label={formatWorkMode(mode)}
                                    onClick={() => pushFilters({ query: search || undefined, workMode: mode, type: selectedType })}
                                />
                            ))}
                        </div>
                    </div>

                    {typeOptions.length > 0 && (
                        <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Type</p>
                            <div className="flex flex-wrap gap-2">
                                <FilterPill active={selectedType === "ALL"} label="All" onClick={() => pushFilters({ query: search || undefined, workMode: selectedWorkMode, type: "ALL" })} />
                                {typeOptions.map((type) => (
                                    <FilterPill
                                        key={type}
                                        active={selectedType === type}
                                        label={formatJobType(type)}
                                        onClick={() => pushFilters({ query: search || undefined, workMode: selectedWorkMode, type })}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {isSeeker && (
                        <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Match preferences</p>
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-2">
                                    {WORK_MODES.map((mode) => (
                                        <FilterPill
                                            key={`pref-${mode}`}
                                            active={preferredWorkModes.includes(mode)}
                                            label={formatWorkMode(mode)}
                                            onClick={() =>
                                                setPreferredWorkModes((prev) =>
                                                    prev.includes(mode) ? prev.filter((item) => item !== mode) : [...prev, mode]
                                                )
                                            }
                                        />
                                    ))}
                                </div>
                                {typeOptions.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {typeOptions.map((type) => (
                                            <FilterPill
                                                key={`pref-type-${type}`}
                                                active={preferredJobTypes.includes(type)}
                                                label={formatJobType(type)}
                                                onClick={() =>
                                                    setPreferredJobTypes((prev) =>
                                                        prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type]
                                                    )
                                                }
                                            />
                                        ))}
                                    </div>
                                )}
                                <input
                                    type="text"
                                    value={preferredLocationsInput}
                                    onChange={(e) => setPreferredLocationsInput(e.target.value)}
                                    placeholder="Preferred locations (comma-separated)"
                                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                                />
                                <input
                                    type="text"
                                    value={preferredSkillsInput}
                                    onChange={(e) => setPreferredSkillsInput(e.target.value)}
                                    placeholder="Priority skills (comma-separated)"
                                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                                />
                                <button
                                    type="button"
                                    onClick={savePreferences}
                                    disabled={isSavingPrefs}
                                    className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-black disabled:opacity-60"
                                >
                                    {isSavingPrefs ? "Saving..." : "Save preferences"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {isSlowNetwork && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                    Slow network detected. We are still loading fresh roles.
                </div>
            )}

            <section className="mt-6 overflow-hidden rounded-2xl border border-stone-200/80 bg-white/80 shadow-[0_20px_60px_-50px_rgba(17,24,39,0.4)] dark:border-slate-800 dark:bg-slate-900/80">
                <div className="hidden sm:grid grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_auto] gap-2 border-b border-stone-200/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:border-slate-800">
                    <span>Role</span>
                    <span>Mode</span>
                    <span className="sm:text-right">Action</span>
                </div>

                {loading ? (
                    <div className="divide-y divide-stone-200/70 dark:divide-slate-800">
                        {[1, 2, 3, 4, 5, 6].map((row) => (
                            <div key={row} className="grid animate-pulse grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_auto]">
                                <div className="h-10 rounded-xl bg-stone-100 dark:bg-slate-800" />
                                <div className="h-10 rounded-xl bg-stone-100 dark:bg-slate-800" />
                                <div className="h-10 rounded-xl bg-stone-100 dark:bg-slate-800 sm:w-24" />
                            </div>
                        ))}
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <Briefcase className="mx-auto text-slate-300 dark:text-slate-700" size={32} />
                        <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">No jobs match that filter yet.</h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Try broadening the search or switching work mode.</p>
                    </div>
                ) : (
                    <div>
                        {jobs.map((job) => (
                            <div key={job.id}>
                                <JobListRow
                                    job={job}
                                    isSaved={savedJobIds.has(job.id)}
                                    isApplied={appliedJobIds.has(job.id)}
                                    onOpen={() => setSelectedJob(job)}
                                    onToggleSave={() => handleToggleSave(job.id)}
                                />
                                {isSeeker && (
                                    <div className="border-b border-stone-200/70 px-4 pb-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                                        Why this job: {getMatchReason(job)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <div className="mt-5 flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <MapPin size={16} />
                    Malawi-first board with broader regional and global roles.
                </p>
                <a href="/register?role=employer" className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
                    Post a job
                    <ArrowUpRight size={16} />
                </a>
            </div>

            {!loading && totalPages > 1 && (
                <div className="mt-6">
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
            )}

            <AnimatePresence>
                {selectedJob && (
                    <JobDetailModal
                        job={selectedJob}
                        isSaved={savedJobIds.has(selectedJob.id)}
                        isApplied={appliedJobIds.has(selectedJob.id)}
                        profileCompletion={profileCompletion}
                        isSubscribed={isSubscribed}
                        applicationsThisMonth={applicationsThisMonth}
                        seekerSkills={seekerSkills}
                        publicMode={!isSeeker}
                        publicViewerMode={publicViewerMode}
                        onReport={() => handleReportEmployer(selectedJob)}
                        onClose={() => setSelectedJob(null)}
                        onSave={() => handleToggleSave(selectedJob.id)}
                        onApply={(answers) => handleApply(selectedJob.id, answers)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
