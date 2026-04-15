"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    jobQuickFormSchema,
    JobQuickFormValues,
    parseCommaSkills,
    parseScreeningQuestions,
    serializeCommaSkills,
    serializeScreeningQuestions
} from "@/lib/validations/job";
import { apiFetch, apiFetchJson } from "@/lib/api";
import { Briefcase, MapPin, Loader2, Calendar, DollarSign, ChevronDown, ChevronUp, Globe2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/ui";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function EditJobPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const router = useRouter();
    const params = useParams();
    const jobId = params.id as string;

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<JobQuickFormValues>({
        resolver: zodResolver(jobQuickFormSchema) as any,
        defaultValues: {
            title: "",
            description: "",
            location: "",
            type: "FULL_TIME",
            workMode: "REMOTE",
            skillsInput: "",
            mustHaveSkillsInput: "",
            niceToHaveSkillsInput: "",
            minimumYearsExperience: 0,
            qualification: "",
            screeningQuestionsInput: "",
            salaryRange: "",
            deadline: "",
            status: "ACTIVE",
        },
    });

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const res = await apiFetch(`/api/jobs/${jobId}`);
                if (res.ok) {
                    const data = await res.json();
                    reset({
                        title: data.title,
                        description: data.description,
                        location: data.location,
                        type: data.type,
                        workMode: data.work_mode || "REMOTE",
                        status: data.status || 'ACTIVE',
                        skillsInput: serializeCommaSkills(data.skills),
                        mustHaveSkillsInput: serializeCommaSkills(data.must_have_skills),
                        niceToHaveSkillsInput: serializeCommaSkills(data.nice_to_have_skills),
                        minimumYearsExperience: data.minimum_years_experience || 0,
                        qualification: data.qualification || "",
                        screeningQuestionsInput: serializeScreeningQuestions(data.screening_questions),
                        salaryRange: data.salary_range || "",
                        deadline: data.deadline ? new Date(data.deadline).toISOString().split('T')[0] : "",
                    });
                } else {
                    toast.error("Failed to load job details.");
                    router.push("/dashboard/employer/jobs");
                }
            } catch (err) {
                console.error("Failed to fetch job:", err);
                toast.error("Error loading job details.");
                router.push("/dashboard/employer/jobs");
            } finally {
                setLoading(false);
            }
        };
        fetchJob();
    }, [jobId, reset, router]);

    const onSubmit = async (data: JobQuickFormValues) => {
        setSaving(true);
        try {
            const skills = parseCommaSkills(data.skillsInput);
            const mustHaveSkills = parseCommaSkills(data.mustHaveSkillsInput?.trim() ? data.mustHaveSkillsInput : data.skillsInput);
            const niceToHaveSkills = parseCommaSkills(data.niceToHaveSkillsInput || "");
            const screeningQuestions = parseScreeningQuestions(data.screeningQuestionsInput);
            const deadline = data.deadline?.trim() || undefined;

            await apiFetchJson(`/api/jobs/${jobId}`, {
                method: "PUT",
                body: JSON.stringify({
                    title: data.title,
                    description: data.description,
                    location: data.location,
                    type: data.type,
                    workMode: data.workMode,
                    status: data.status,
                    skills,
                    mustHaveSkills,
                    niceToHaveSkills,
                    minimumYearsExperience: data.minimumYearsExperience || 0,
                    qualification: data.qualification?.trim() || undefined,
                    screeningQuestions,
                    salaryRange: data.salaryRange?.trim() || undefined,
                    deadline,
                }),
            });
            toast.success("Job updated successfully");
            router.push("/dashboard/employer/jobs");
            router.refresh();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Could not update job";
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const inputClass =
        "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500";

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-16 px-1 sm:px-0">
            <PageHeader
                title="Edit Job"
                subtitle="Update your job listing details below."
                action={{ label: "Back", href: "/dashboard/employer/jobs", variant: "secondary" }}
            />

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 p-4 sm:p-6 space-y-5">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Job title</label>
                        <input {...register("title")} placeholder="e.g. Product Designer" className={inputClass} />
                        {errors.title && (
                            <p className="text-xs text-red-600 dark:text-red-400">{errors.title.message}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <MapPin size={14} /> Location
                            </label>
                            <input
                                {...register("location")}
                                placeholder="Remote or City, Country"
                                className={inputClass}
                            />
                            {errors.location && (
                                <p className="text-xs text-red-600 dark:text-red-400">{errors.location.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Job type</label>
                            <select {...register("type")} className={cn(inputClass, "appearance-none")}>
                                <option value="FULL_TIME">Full-time</option>
                                <option value="PART_TIME">Part-time</option>
                                <option value="CONTRACT">Contract</option>
                                <option value="FREELANCE">Freelance</option>
                                <option value="INTERNSHIP">Internship</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Globe2 size={14} /> Work mode
                            </label>
                            <select {...register("workMode")} className={cn(inputClass, "appearance-none")}>
                                <option value="REMOTE">Remote</option>
                                <option value="HYBRID">Hybrid</option>
                                <option value="ON_SITE">On-site</option>
                            </select>
                            {errors.workMode && (
                                <p className="text-xs text-red-600 dark:text-red-400">{errors.workMode.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Status</label>
                            <select {...register("status")} className={cn(inputClass, "appearance-none")}>
                                <option value="ACTIVE">Active</option>
                                <option value="PENDING">Pending Approval</option>
                                <option value="EXPIRED">Expired</option>
                                <option value="FILLED">Filled</option>
                                <option value="ARCHIVED">Archived</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">What they&apos;ll do</label>
                        <textarea
                            {...register("description")}
                            rows={5}
                            placeholder="Role, responsibilities, and what success looks like (min. 20 characters)."
                            className={cn(inputClass, "resize-y min-h-[120px]")}
                        />
                        {errors.description && (
                            <p className="text-xs text-red-600 dark:text-red-400">{errors.description.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Skills (comma-separated)</label>
                        <input
                            {...register("skillsInput")}
                            placeholder="e.g. React, TypeScript, Communication"
                            className={inputClass}
                        />
                        {errors.skillsInput && (
                            <p className="text-xs text-red-600 dark:text-red-400">{errors.skillsInput.message}</p>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setAdvancedOpen((o) => !o)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-800 dark:text-slate-200 bg-slate-50/80 dark:bg-slate-900/50 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                        More options — screening, salary &amp; deadline
                        {advancedOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    {advancedOpen && (
                        <div className="p-4 sm:p-5 space-y-4 border-t border-slate-200 dark:border-slate-800">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Must-have skills</label>
                                <input
                                    {...register("mustHaveSkillsInput")}
                                    placeholder="Defaults to the main skills list if left empty"
                                    className={inputClass}
                                />
                                <p className="text-xs text-slate-500">Comma-separated skills used as hard requirements in employer review.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Nice-to-have skills</label>
                                <input
                                    {...register("niceToHaveSkillsInput")}
                                    placeholder="e.g. Leadership, SQL, sales reporting"
                                    className={inputClass}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Required Qualification</label>
                                <input {...register("qualification")} placeholder="e.g. Degree in Clinical Medicine" className={inputClass} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Minimum years of experience</label>
                                <input type="number" min={0} step={1} {...register("minimumYearsExperience")} className={inputClass} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Knockout questions</label>
                                <textarea
                                    {...register("screeningQuestionsInput")}
                                    rows={4}
                                    placeholder={"One per line. Format: Question | YES | required\nExample: Available to work weekends? | YES | required"}
                                    className={cn(inputClass, "min-h-[120px] resize-y")}
                                />
                                <p className="text-xs text-slate-500">Use `YES` or `NO`, then `required` or `optional`. If omitted, questions default to `YES | required`.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <DollarSign size={14} /> Salary (optional)
                                </label>
                                <input
                                    {...register("salaryRange")}
                                    placeholder="e.g. MWK 2M – 3M or $80k – $100k"
                                    className={inputClass}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <Calendar size={14} /> Application deadline
                                </label>
                                <input type="date" {...register("deadline")} className={cn(inputClass, "font-mono text-sm")} />
                                {errors.deadline && (
                                    <p className="text-xs text-red-600 dark:text-red-400">{errors.deadline.message}</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 pt-2">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-colors bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Briefcase size={18} />}
                        {saving ? "Saving…" : "Save changes"}
                    </button>
                </div>
            </form>
        </div>
    );
}
