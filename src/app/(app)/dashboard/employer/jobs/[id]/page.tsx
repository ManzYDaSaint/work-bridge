"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
    Loader2, ChevronLeft, MapPin, Briefcase, Users,
    Calendar, ExternalLink, Clock
} from "lucide-react";
import { Badge, SectionCard } from "@/components/dashboard/ui";
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
    salary_range: string | null;
    deadline: string | null;
    status: string;
    created_at: string;
    employer_id: string;
    employers?: { company_name: string; logo_url: string | null };
}



export default function JobDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [job, setJob] = useState<JobDetail | null>(null);
    const [loading, setLoading] = useState(true);

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

            {/* Performance Analytics */}
            <JobAnalyticsPanel jobId={job.id} />

            {/* Job Content */}
            {/* Job Overview */}
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
        </div>
    );
}

