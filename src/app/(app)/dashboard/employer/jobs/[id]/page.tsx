"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
    Loader2, ChevronLeft, MapPin, Briefcase, Users,
    Calendar, ExternalLink, Clock, Sparkles, Building2,
    Mail, Phone, MessageSquare, Globe, FileText, Award,
    CheckCircle2, Copy, Check, BarChart3, AlertTriangle,
    Zap, Share2, X, QrCode, RefreshCw, Activity, Share
} from "lucide-react";
import { Badge } from "@/components/dashboard/ui";
import Link from "next/link";
import JobAnalyticsPanel from "@/components/dashboard/employer/JobAnalyticsPanel";

interface JobDetail {
    id: string;
    title: string;
    description: string;
    location: string;
    type: string;
    work_mode: string;
    skills: string[];
    must_have_skills: string[];
    nice_to_have_skills?: string[];
    minimum_years_experience?: number | null;
    qualification?: string | null;
    salary_range: string | null;
    deadline: string | null;
    status: string;
    public_slug?: string;
    created_at: string;
    updated_at?: string;
    employer_id: string;
    employers?: { company_name: string; logo_url: string | null };

    // V2 Application Channels & Company Specs
    application_method?: string | null;
    external_apply_url?: string | null;
    apply_email?: string | null;
    apply_whatsapp?: string | null;
    apply_phone?: string | null;
    application_instructions?: string | null;
    allow_one_tap_apply?: boolean;
    posting_type?: string | null;
    display_company_name?: string | null;
    job_source?: string | null;
    screening_questions?: Array<{ question: string; required?: boolean }> | null;
}

export default function JobDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [job, setJob] = useState<JobDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"overview" | "pipeline" | "analytics">("overview");
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [extendingDeadline, setExtendingDeadline] = useState(false);
    const [showStickyBar, setShowStickyBar] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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
    }, [params.id, router]);

    // Sticky Action Bar Scroll Listener
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 300) {
                setShowStickyBar(true);
            } else {
                setShowStickyBar(false);
            }
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleCopy = (text: string, fieldName: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!job || updatingStatus) return;
        setUpdatingStatus(true);
        try {
            const res = await apiFetch(`/api/jobs/${job.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                setJob({ ...job, status: newStatus });
            }
        } catch (err) {
            console.error("Failed to update status:", err);
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleExtendDeadline = async () => {
        if (!job || extendingDeadline) return;
        setExtendingDeadline(true);
        try {
            // Set deadline to 30 days from today
            const newDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            const res = await apiFetch(`/api/jobs/${job.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ deadline: newDeadline, status: "ACTIVE" }),
            });
            if (res.ok) {
                const updated = await res.json();
                setJob(updated.job || { ...job, deadline: newDeadline, status: "ACTIVE" });
            }
        } catch (err) {
            console.error("Failed to extend deadline:", err);
        } finally {
            setExtendingDeadline(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#16324f]" />
                <p className="text-sm font-medium text-slate-500">Loading Job Specification...</p>
            </div>
        );
    }

    if (!job) return null;

    const companyDisplayName = job.display_company_name || job.employers?.company_name || "Direct Employer";
    const mustHave = job.must_have_skills || [];
    const niceToHave = job.nice_to_have_skills || [];
    const generalSkills = (job.skills || []).filter(
        (s) => !mustHave.includes(s) && !niceToHave.includes(s)
    );

    const publicUrl = typeof window !== "undefined"
        ? `${window.location.origin}/jobs/${job.public_slug || job.id}`
        : `/jobs/${job.public_slug || job.id}`;

    // Calculate Qualification-focused AI Listing Health Score
    let healthScore = 0;
    const healthAdvice: string[] = [];

    if (job.qualification) {
        healthScore += 30;
    } else {
        healthAdvice.push("Specify required educational qualification (e.g., Bachelor's Degree) to refine candidate search.");
    }

    if (job.description && job.description.length >= 150) {
        healthScore += 25;
    } else {
        healthAdvice.push("Expand job description details to improve AI contextual match accuracy.");
    }

    if (job.minimum_years_experience !== undefined && job.minimum_years_experience !== null) {
        healthScore += 20;
    } else {
        healthAdvice.push("Set minimum years of experience to filter candidate seniority accurately.");
    }

    if (job.salary_range) {
        healthScore += 15;
    } else {
        healthAdvice.push("Add salary range transparency to boost applicant response rate.");
    }

    if (job.application_method) {
        healthScore += 10;
    }

    // Days remaining on deadline calculation
    const now = new Date();
    const deadlineDate = job.deadline ? new Date(job.deadline) : null;
    const isPastDeadline = deadlineDate ? deadlineDate < now : false;
    const daysRemaining = deadlineDate ? Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
    const isDeadlineNear = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7;

    return (
        <div className="space-y-6 pb-28">
            {/* Top Navigation */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                >
                    <ChevronLeft size={16} /> Back to Jobs Overview
                </button>

                {/* Quick Status Dropdown & Share */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsShareModalOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-stone-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                    >
                        <Share2 size={13} className="text-indigo-600 dark:text-indigo-400" /> Share Listing
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:inline">Status:</span>
                        <select
                            value={job.status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            disabled={updatingStatus}
                            className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                        >
                            <option value="ACTIVE">● Active</option>
                            <option value="FILLED">✓ Filled</option>
                            <option value="PENDING">⏱ Pending</option>
                            <option value="EXPIRED">✕ Expired</option>
                            <option value="ARCHIVED">📁 Archived</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Expiring or Past Deadline Warning Banner */}
            {(isPastDeadline || isDeadlineNear) && (
                <div className="flex flex-col justify-between gap-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 dark:border-amber-900/50 dark:from-amber-950/40 dark:to-orange-950/30 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                                {isPastDeadline
                                    ? "This job listing deadline has passed."
                                    : `Listing expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}.`}
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-400">
                                Extend the deadline by 30 days to keep receiving candidate applications.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleExtendDeadline}
                        disabled={extendingDeadline}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
                    >
                        {extendingDeadline ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Extend 30 Days
                    </button>
                </div>
            )}

            {/* Glassmorphic Modern Hero Card */}
            <div className="relative overflow-hidden rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 md:p-8">
                <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
                    <div className="space-y-4">
                        {/* Company Badge & Posting Type */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                <Building2 size={13} className="text-[#16324f] dark:text-indigo-400" />
                                {companyDisplayName}
                            </span>
                            {job.posting_type && (
                                <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                                    {job.posting_type} Listing
                                </span>
                            )}
                            <Badge
                                label={job.status}
                                variant={job.status === "ACTIVE" ? "green" : job.status === "FILLED" ? "blue" : "slate"}
                            />
                        </div>

                        {/* Title */}
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white md:text-3xl">
                            {job.title}
                        </h1>

                        {/* Key Attributes Pills */}
                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                            <span className="flex items-center gap-1.5 rounded-md bg-stone-50 px-2.5 py-1 text-xs font-medium dark:bg-slate-800/60">
                                <MapPin size={13} className="text-slate-400" /> {job.location}
                            </span>
                            <span className="flex items-center gap-1.5 rounded-md bg-stone-50 px-2.5 py-1 text-xs font-medium dark:bg-slate-800/60">
                                <Briefcase size={13} className="text-slate-400" /> {job.type?.replace(/_/g, " ")}
                            </span>
                            {job.work_mode && (
                                <span className="flex items-center gap-1.5 rounded-md bg-stone-50 px-2.5 py-1 text-xs font-medium dark:bg-slate-800/60">
                                    <Globe size={13} className="text-slate-400" /> {job.work_mode.replace(/_/g, " ")}
                                </span>
                            )}
                            {job.salary_range && (
                                <span className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                                    💰 {job.salary_range}
                                </span>
                            )}
                        </div>

                        {/* Posted / Expiration Info */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                            <span className="flex items-center gap-1.5">
                                <Clock size={12} /> Posted {new Date(job.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                            {job.deadline && (
                                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                                    <Calendar size={12} /> Deadline: {new Date(job.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Primary Action Buttons Bar */}
                    <div className="flex flex-wrap items-center gap-2.5 lg:flex-col lg:items-end">
                        <Link
                            href={`/dashboard/employer/jobs/${job.id}/discover`}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#16324f] to-indigo-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95 dark:from-indigo-600 dark:to-blue-600"
                        >
                            <Sparkles size={16} /> AI Match Candidates
                        </Link>
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href={`/dashboard/employer/candidates?jobId=${job.id}`}
                                className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-stone-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                                <Users size={14} /> Pipeline
                            </Link>
                            <Link
                                href={`/dashboard/employer/jobs/${job.id}/edit`}
                                className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-stone-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                Edit Role
                            </Link>
                            <button
                                onClick={() => setIsShareModalOpen(true)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 p-2 text-slate-600 hover:bg-stone-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
                                title="Share Listing"
                            >
                                <Share2 size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sub-Navigation Tabs */}
                <div className="mt-8 flex border-b border-stone-200 dark:border-slate-800">
                    <button
                        onClick={() => setActiveTab("overview")}
                        className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${
                            activeTab === "overview"
                                ? "border-[#16324f] text-[#16324f] dark:border-indigo-400 dark:text-indigo-400"
                                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400"
                        }`}
                    >
                        <FileText size={15} /> Overview & Specs
                    </button>
                    <button
                        onClick={() => setActiveTab("pipeline")}
                        className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${
                            activeTab === "pipeline"
                                ? "border-[#16324f] text-[#16324f] dark:border-indigo-400 dark:text-indigo-400"
                                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400"
                        }`}
                    >
                        <Users size={15} /> Candidates & AI Match
                    </button>
                    <button
                        onClick={() => setActiveTab("analytics")}
                        className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${
                            activeTab === "analytics"
                                ? "border-[#16324f] text-[#16324f] dark:border-indigo-400 dark:text-indigo-400"
                                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400"
                        }`}
                    >
                        <BarChart3 size={15} /> Performance & Reach
                    </button>
                </div>
            </div>

            {/* TAB CONTENT: OVERVIEW & SPECS */}
            {activeTab === "overview" && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Left Column: Job Description & Screening */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* AI Listing Health & Qualification Readiness Meter */}
                        <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-7">
                            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                                <div className="flex items-center gap-3">
                                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                                        healthScore >= 80 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400" :
                                        healthScore >= 60 ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400" :
                                        "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
                                    }`}>
                                        <Activity size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                            AI Match Readiness Score
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Evaluates specification completeness for accurate candidate matching
                                        </p>
                                    </div>
                                </div>
                                <div className="text-left sm:text-right">
                                    <span className="text-2xl font-black text-slate-900 dark:text-white">{healthScore}%</span>
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                        {healthScore >= 80 ? "High Match Strength" : healthScore >= 60 ? "Good Match Strength" : "Needs Optimization"}
                                    </p>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                <div
                                    className={`h-full transition-all duration-500 ${
                                        healthScore >= 80 ? "bg-emerald-500" : healthScore >= 60 ? "bg-indigo-500" : "bg-amber-500"
                                    }`}
                                    style={{ width: `${healthScore}%` }}
                                />
                            </div>

                            {/* Advice Items */}
                            {healthAdvice.length > 0 && (
                                <div className="mt-4 space-y-2 border-t border-stone-100 pt-3 dark:border-slate-800">
                                    {healthAdvice.map((advice, i) => (
                                        <div key={i} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                                            <span className="mt-0.5">•</span>
                                            <span>{advice}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Description Card */}
                        <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8">
                            <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
                                Role Description & Scope
                            </h2>
                            <div className="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                                <p className="whitespace-pre-wrap">{job.description || "No description provided."}</p>
                            </div>
                        </div>

                        {/* Screening Questions (if present) */}
                        {job.screening_questions && job.screening_questions.length > 0 && (
                            <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8">
                                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                                    <CheckCircle2 size={18} className="text-indigo-600 dark:text-indigo-400" />
                                    Screening Questions ({job.screening_questions.length})
                                </h2>
                                <div className="space-y-3">
                                    {job.screening_questions.map((q, idx) => (
                                        <div key={idx} className="flex items-start gap-3 rounded-2xl border border-stone-100 bg-stone-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                                                {idx + 1}
                                            </span>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{q.question}</p>
                                                {q.required && (
                                                    <span className="mt-1 inline-block text-[11px] font-medium text-amber-600 dark:text-amber-400">* Required response</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Application Details, Requirements & Meta */}
                    <div className="space-y-6">
                        {/* Application Channel & Recruiting Company Card */}
                        <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                                <Mail size={16} className="text-[#16324f] dark:text-indigo-400" /> Application Details
                            </h2>

                            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
                                {/* Recruiting Company */}
                                <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
                                    <span className="font-medium text-slate-400 block mb-1">Recruiting Entity</span>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <Building2 size={14} className="text-slate-500" />
                                        {companyDisplayName}
                                    </p>
                                </div>

                                {/* Application Method */}
                                <div className="space-y-2">
                                    <span className="font-medium text-slate-400 block">Primary Application Channel</span>
                                    <div className="flex items-center gap-2">
                                        <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 uppercase dark:bg-indigo-950/50 dark:text-indigo-300">
                                            {job.application_method?.replace(/_/g, " ") || "One-Tap Standard"}
                                        </span>
                                        {job.allow_one_tap_apply !== false && (
                                            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                                <Zap size={12} /> One-Tap Active
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Apply Email */}
                                {job.apply_email && (
                                    <div className="space-y-1">
                                        <span className="font-medium text-slate-400 block">Receiving Application Email</span>
                                        <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                                            <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                {job.apply_email}
                                            </span>
                                            <button
                                                onClick={() => handleCopy(job.apply_email!, "email")}
                                                className="ml-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                                title="Copy email"
                                            >
                                                {copiedField === "email" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* WhatsApp / Phone */}
                                {(job.apply_whatsapp || job.apply_phone) && (
                                    <div className="space-y-2">
                                        <span className="font-medium text-slate-400 block">Contact Phone / WhatsApp</span>
                                        {job.apply_whatsapp && (
                                            <p className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                                                <MessageSquare size={14} className="text-emerald-500" /> {job.apply_whatsapp}
                                            </p>
                                        )}
                                        {job.apply_phone && (
                                            <p className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                                                <Phone size={14} className="text-blue-500" /> {job.apply_phone}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* External Apply URL */}
                                {job.external_apply_url && (
                                    <div className="space-y-1">
                                        <span className="font-medium text-slate-400 block">External ATS / Portal Link</span>
                                        <a
                                            href={job.external_apply_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 hover:underline dark:text-indigo-400 truncate max-w-full"
                                        >
                                            {job.external_apply_url} <ExternalLink size={12} />
                                        </a>
                                    </div>
                                )}

                                {/* Application Instructions */}
                                {job.application_instructions && (
                                    <div className="mt-3 rounded-2xl border border-amber-200/60 bg-amber-50/50 p-3 dark:border-amber-900/30 dark:bg-amber-950/20">
                                        <span className="font-semibold text-amber-800 dark:text-amber-400 block mb-1">Special Candidate Instructions</span>
                                        <p className="text-xs text-amber-900/80 dark:text-amber-300 whitespace-pre-line">{job.application_instructions}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Requirements & Skill Breakdown Card */}
                        <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                                <Award size={16} className="text-[#16324f] dark:text-indigo-400" /> Candidate Specifications
                            </h2>

                            <div className="space-y-4 text-xs">
                                {/* Experience & Qualification */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                                        <span className="text-slate-400 block font-medium">Min. Experience</span>
                                        <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                                            {job.minimum_years_experience !== undefined && job.minimum_years_experience !== null
                                                ? `${job.minimum_years_experience} Yrs`
                                                : "Not Specified"}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                                        <span className="text-slate-400 block font-medium">Qualification</span>
                                        <p className="mt-1 text-xs font-bold text-slate-900 dark:text-white truncate" title={job.qualification || "Any"}>
                                            {job.qualification || "Any Standard"}
                                        </p>
                                    </div>
                                </div>

                                {/* Must-Have Skills */}
                                <div>
                                    <span className="font-semibold text-slate-600 dark:text-slate-400 block mb-2">
                                        Must-Have Skills ({mustHave.length})
                                    </span>
                                    {mustHave.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {mustHave.map((skill, i) => (
                                                <span key={i} className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 border border-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/30">
                                                    ★ {skill}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-400 italic">No must-have skills flagged.</p>
                                    )}
                                </div>

                                {/* Nice-to-Have Skills */}
                                {niceToHave.length > 0 && (
                                    <div>
                                        <span className="font-semibold text-slate-600 dark:text-slate-400 block mb-2">
                                            Nice-to-Have Skills ({niceToHave.length})
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {niceToHave.map((skill, i) => (
                                                <span key={i} className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                                                    + {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Additional Skills */}
                                {generalSkills.length > 0 && (
                                    <div>
                                        <span className="font-semibold text-slate-600 dark:text-slate-400 block mb-2">
                                            Other Related Tags
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {generalSkills.map((skill, i) => (
                                                <span key={i} className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Public Link & Sharing Quick Utility */}
                        <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                                Public Share & Source
                            </h2>
                            <div className="space-y-3">
                                <button
                                    onClick={() => setIsShareModalOpen(true)}
                                    className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                >
                                    <span className="flex items-center gap-2 truncate">
                                        <Share2 size={14} className="text-indigo-500" /> Share Listing & QR Code
                                    </span>
                                    <ChevronLeft size={14} className="rotate-180 text-slate-400" />
                                </button>
                                {job.job_source && (
                                    <p className="text-[11px] text-slate-400">
                                        Source origin: <span className="font-medium text-slate-600 dark:text-slate-300">{job.job_source}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: CANDIDATES & AI MATCH */}
            {activeTab === "pipeline" && (
                <div className="space-y-6">
                    <div className="rounded-3xl border border-stone-200/80 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                            <Sparkles size={28} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            AI Candidate Discovery & Pipeline
                        </h2>
                        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500 dark:text-slate-400">
                            Our AI engine matches candidate talent directly against your must-have skills, qualifications, and experience parameters.
                        </p>
                        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                            <Link
                                href={`/dashboard/employer/jobs/${job.id}/discover`}
                                className="inline-flex items-center gap-2 rounded-xl bg-[#16324f] px-6 py-3 text-sm font-semibold text-white shadow-md hover:opacity-90 dark:bg-indigo-600"
                            >
                                <Sparkles size={16} /> Open AI Candidate Matcher
                            </Link>
                            <Link
                                href={`/dashboard/employer/candidates?jobId=${job.id}`}
                                className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            >
                                <Users size={16} /> View Full Applicant Kanban Pipeline
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: PERFORMANCE & REACH */}
            {activeTab === "analytics" && (
                <div className="space-y-6">
                    <JobAnalyticsPanel jobId={job.id} />
                </div>
            )}

            {/* STICKY BOTTOM ACTION BAR ON SCROLL */}
            {showStickyBar && (
                <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 transform transition-all duration-300">
                    <div className="flex items-center gap-4 rounded-2xl border border-slate-700/80 bg-slate-900/95 px-5 py-3 shadow-2xl backdrop-blur-md dark:border-slate-800">
                        <div className="hidden sm:block">
                            <p className="text-xs font-bold text-white max-w-[200px] truncate">{job.title}</p>
                            <p className="text-[11px] text-slate-400 truncate">{companyDisplayName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link
                                href={`/dashboard/employer/jobs/${job.id}/discover`}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-90"
                            >
                                <Sparkles size={13} /> AI Match
                            </Link>
                            <Link
                                href={`/dashboard/employer/candidates?jobId=${job.id}`}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                            >
                                <Users size={13} /> Pipeline
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* MULTI-CHANNEL SOCIAL SHARE & QR CODE MODAL */}
            {isShareModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
                    <div className="relative w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 md:p-8">
                        {/* Close button */}
                        <button
                            onClick={() => setIsShareModalOpen(false)}
                            className="absolute right-5 top-5 rounded-full p-1.5 text-slate-400 hover:bg-stone-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        >
                            <X size={18} />
                        </button>

                        <div className="text-center">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                                <Share2 size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                Share Listing & Candidate QR
                            </h3>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Multi-channel posting for {job.title}
                            </p>
                        </div>

                        {/* Social Buttons Grid */}
                        <div className="mt-6 grid grid-cols-2 gap-2.5">
                            <a
                                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-center gap-2 rounded-xl bg-[#0a66c2] px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
                            >
                                LinkedIn Share
                            </a>
                            <a
                                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out this job: ${job.title} at ${companyDisplayName} - ${publicUrl}`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-center gap-2 rounded-xl bg-[#25d366] px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
                            >
                                WhatsApp
                            </a>
                            <a
                                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`We're hiring: ${job.title} at ${companyDisplayName}`)}&url=${encodeURIComponent(publicUrl)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 dark:bg-slate-800"
                            >
                                X / Twitter
                            </a>
                            <a
                                href={`mailto:?subject=${encodeURIComponent(`Job Opportunity: ${job.title}`)}&body=${encodeURIComponent(`Check out this position at ${companyDisplayName}: ${publicUrl}`)}`}
                                className="flex items-center justify-center gap-2 rounded-xl bg-stone-100 px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-stone-200 dark:bg-slate-800 dark:text-slate-200"
                            >
                                Mail Link
                            </a>
                        </div>

                        {/* QR Code Container */}
                        <div className="mt-6 rounded-2xl border border-stone-100 bg-stone-50/80 p-4 text-center dark:border-slate-800 dark:bg-slate-800/40">
                            <p className="mb-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5">
                                <QrCode size={14} /> Scan Mobile QR Code
                            </p>
                            <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-xl bg-white p-2 shadow-sm border border-stone-200 dark:border-slate-700">
                                {/* Vector QR Code Generator API */}
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(publicUrl)}`}
                                    alt="Job QR Code"
                                    className="h-full w-full object-contain"
                                />
                            </div>
                        </div>

                        {/* Copy Link Input Bar */}
                        <div className="mt-4 flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                            <span className="font-mono text-xs text-slate-600 dark:text-slate-300 truncate max-w-[240px]">
                                {publicUrl}
                            </span>
                            <button
                                onClick={() => handleCopy(publicUrl, "modalLink")}
                                className="ml-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400 shrink-0"
                            >
                                {copiedField === "modalLink" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                {copiedField === "modalLink" ? "Copied" : "Copy"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


