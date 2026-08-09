"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    jobQuickFormSchema,
    JobQuickFormValues,
} from "@/lib/validations/job";
import { ChevronDown, ChevronUp, DollarSign, Globe2, Link2, Mail, MapPin, MessageCircle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface JobPostingFormProps {
    defaultValues?: Partial<JobQuickFormValues>;
    onSubmit: (data: JobQuickFormValues) => Promise<void>;
    saving?: boolean;
    submitLabel?: string;
}

export function JobPostingForm({ defaultValues, onSubmit, saving = false, submitLabel = "Save Job" }: JobPostingFormProps) {
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [sourcingOpen, setSourcingOpen] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<JobQuickFormValues>({
        resolver: zodResolver(jobQuickFormSchema) as any,
        defaultValues: {
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
            applicationMethod: "one_tap",
            allowOneTapApply: true,
            postingType: "DIRECT",
            ...defaultValues,
        },
    });

    const applicationMethod = watch("applicationMethod");
    const inputClass = "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500";

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 p-4 sm:p-6 space-y-5">
                <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Job title</label>
                    <input {...register("title")} placeholder="e.g. Product Designer" className={inputClass} />
                    {errors.title && <p className="text-xs text-red-600 dark:text-red-400">{errors.title.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <MapPin size={14} /> Location
                        </label>
                        <input {...register("location")} placeholder="Remote or City, Country" className={inputClass} />
                        {errors.location && <p className="text-xs text-red-600 dark:text-red-400">{errors.location.message}</p>}
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
                    <div className="space-y-2 sm:col-span-2">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Globe2 size={14} /> Work mode
                        </label>
                        <select {...register("workMode")} className={cn(inputClass, "appearance-none")}>
                            <option value="REMOTE">Remote</option>
                            <option value="HYBRID">Hybrid</option>
                            <option value="ON_SITE">On-site</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">What they&apos;ll do</label>
                    <textarea {...register("description")} rows={5} placeholder="Role, responsibilities..." className={cn(inputClass, "resize-y min-h-[120px]")} />
                    {errors.description && <p className="text-xs text-red-600 dark:text-red-400">{errors.description.message}</p>}
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Skills (comma-separated)</label>
                    <input {...register("skillsInput")} placeholder="e.g. React, TypeScript" className={inputClass} />
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <button type="button" onClick={() => setAdvancedOpen(!advancedOpen)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 transition-colors">
                    More options — screening, salary &amp; deadline {advancedOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {advancedOpen && (
                    <div className="p-4 sm:p-5 space-y-4 border-t border-slate-200">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Must-have skills</label>
                            <input {...register("mustHaveSkillsInput")} placeholder="Defaults to the main skills list if left empty" className={inputClass} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Nice-to-have skills</label>
                            <input {...register("niceToHaveSkillsInput")} placeholder="e.g. Leadership, SQL" className={inputClass} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Required Qualification</label>
                            <input {...register("qualification")} placeholder="e.g. Degree in Accounting" className={inputClass} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Minimum years of experience</label>
                            <input type="number" {...register("minimumYearsExperience")} className={inputClass} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Salary Range</label>
                            <input {...register("salaryRange")} placeholder="e.g. MWK 2M – 3M" className={inputClass} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Calendar size={14} /> Deadline
                            </label>
                            <input type="date" {...register("deadline")} className={inputClass} />
                        </div>
                    </div>
                )}
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <button type="button" onClick={() => setSourcingOpen(!sourcingOpen)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 transition-colors">
                    Application settings & sourcing {sourcingOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {sourcingOpen && (
                    <div className="p-4 sm:p-5 space-y-6 border-t border-slate-200">
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-slate-900 uppercase">How should candidates apply?</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {(['one_tap', 'external_url', 'email', 'whatsapp'] as const).map((method) => (
                                    <label key={method} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all", applicationMethod === method ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white")}>
                                        <input type="radio" value={method} {...register("applicationMethod")} />
                                        <span className="text-sm font-semibold">{method}</span>
                                    </label>
                                ))}
                            </div>
                            {applicationMethod === "external_url" && <input {...register("externalApplyUrl")} placeholder="https://" className={inputClass} />}
                            {applicationMethod === "email" && <input type="email" {...register("applyEmail")} placeholder="email@company.com" className={inputClass} />}
                        </div>
                        <div className="space-y-4">
                            <label className="text-xs font-semibold text-slate-900 uppercase">Display Settings</label>
                            <select {...register("postingType")} className={cn(inputClass, "appearance-none")}>
                                <option value="DIRECT">Direct Employer</option>
                                <option value="AGENCY">Recruitment Agency</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                {saving ? "Saving..." : submitLabel}
            </button>
        </form>
    );
}
