"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    jobQuickFormSchema,
    JobQuickFormValues,
} from "@/lib/validations/job";
import {
    Briefcase,
    Calendar,
    ChevronDown,
    ChevronUp,
    DollarSign,
    Globe2,
    Link2,
    Loader2,
    Mail,
    MapPin,
    MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface JobPostingFormProps {
    defaultValues?: Partial<JobQuickFormValues>;
    onSubmit: (data: JobQuickFormValues) => Promise<void>;
    saving?: boolean;
    submitLabel?: string;
    companyNamePlaceholder?: string;
    submitDisabled?: boolean;
    submitDisabledTitle?: string;
    showApprovalBanner?: boolean;
    isApproved?: boolean;
    onCancel?: () => void;
    cancelLabel?: string;
}

export function JobPostingForm({
    defaultValues,
    onSubmit,
    saving = false,
    submitLabel = "Publish job",
    companyNamePlaceholder = "your company name",
    submitDisabled = false,
    submitDisabledTitle,
    showApprovalBanner = false,
    isApproved = true,
    onCancel,
    cancelLabel = "Cancel",
}: JobPostingFormProps) {
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
    const inputClass =
        "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500";

    return (
        <div className="space-y-6">
            {showApprovalBanner && !isApproved && (
                <p className="text-sm text-amber-800 dark:text-amber-200/90 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-xl px-4 py-3">
                    Your account is still being verified. You can draft this form, but{" "}
                    <span className="font-semibold">publishing is disabled</span> until approval.
                </p>
            )}

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
                        <div className="space-y-2 sm:col-span-2">
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
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            💡 Adding skills allows our system to automatically score applicants and suggest top-matching candidates instantly.
                        </p>
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
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">Comma-separated skills used as hard requirements to filter applicants.</p>
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
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    💡 Automatically filter candidates before you even see them. Use `YES` or `NO`, then `required` or `optional`.
                                </p>
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
                                <p className="text-xs text-slate-500">
                                    If left empty, we use 30 days from today.
                                </p>
                                {errors.deadline && (
                                    <p className="text-xs text-red-600 dark:text-red-400">{errors.deadline.message}</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setSourcingOpen((o) => !o)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-800 dark:text-slate-200 bg-slate-50/80 dark:bg-slate-900/50 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                        Application settings & sourcing
                        {sourcingOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    {sourcingOpen && (
                        <div className="p-4 sm:p-5 space-y-6 border-t border-slate-200 dark:border-slate-800">
                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                                    How should candidates apply?
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <label className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all", applicationMethod === "one_tap" ? "border-blue-600 bg-blue-50/50 dark:border-blue-500/50 dark:bg-blue-900/20" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/50")}>
                                        <input type="radio" value="one_tap" {...register("applicationMethod")} className="mt-1" />
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Aganyu One-Tap (Recommended)</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Applications appear in your Aganyu dashboard.</p>
                                        </div>
                                    </label>
                                    <label className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all", applicationMethod === "external_url" ? "border-blue-600 bg-blue-50/50 dark:border-blue-500/50 dark:bg-blue-900/20" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/50")}>
                                        <input type="radio" value="external_url" {...register("applicationMethod")} className="mt-1" />
                                        <div>
                                            <p className="flex items-center gap-1 text-sm font-semibold text-slate-900 dark:text-slate-100"><Link2 size={14} /> External Link / ATS</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Redirect applicants to your website.</p>
                                        </div>
                                    </label>
                                    <label className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all", applicationMethod === "email" ? "border-blue-600 bg-blue-50/50 dark:border-blue-500/50 dark:bg-blue-900/20" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/50")}>
                                        <input type="radio" value="email" {...register("applicationMethod")} className="mt-1" />
                                        <div>
                                            <p className="flex items-center gap-1 text-sm font-semibold text-slate-900 dark:text-slate-100"><Mail size={14} /> Email Submission</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Candidates send their CV to an email address.</p>
                                        </div>
                                    </label>
                                    <label className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all", applicationMethod === "whatsapp" ? "border-blue-600 bg-blue-50/50 dark:border-blue-500/50 dark:bg-blue-900/20" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/50")}>
                                        <input type="radio" value="whatsapp" {...register("applicationMethod")} className="mt-1" />
                                        <div>
                                            <p className="flex items-center gap-1 text-sm font-semibold text-slate-900 dark:text-slate-100"><MessageCircle size={14} /> WhatsApp</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Redirect applicants to a WhatsApp chat.</p>
                                        </div>
                                    </label>
                                </div>

                                {applicationMethod === "external_url" && (
                                    <div className="mt-3">
                                        <input {...register("externalApplyUrl")} placeholder="https://jobs.lever.co/..." className={inputClass} />
                                        {errors.externalApplyUrl && <p className="mt-1 text-xs text-red-600">{errors.externalApplyUrl.message}</p>}
                                    </div>
                                )}
                                {applicationMethod === "email" && (
                                    <div className="mt-3">
                                        <input type="email" {...register("applyEmail")} placeholder="careers@company.com" className={inputClass} />
                                        {errors.applyEmail && <p className="mt-1 text-xs text-red-600">{errors.applyEmail.message}</p>}
                                    </div>
                                )}
                                {applicationMethod === "whatsapp" && (
                                    <div className="mt-3">
                                        <input type="tel" {...register("applyWhatsapp")} placeholder="+265 888 123 456" className={inputClass} />
                                    </div>
                                )}
                                {applicationMethod === "phone" && (
                                    <div className="mt-3">
                                        <input type="tel" {...register("applyPhone")} placeholder="+265 999 123 456" className={inputClass} />
                                    </div>
                                )}
                                {applicationMethod === "manual" && (
                                    <div className="mt-3">
                                        <textarea {...register("applicationInstructions")} rows={3} placeholder="Please send your CV and cover letter in a sealed envelope to..." className={cn(inputClass, "resize-y")} />
                                    </div>
                                )}

                                {applicationMethod !== "one_tap" && (
                                    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                                        <div className="flex h-5 items-center">
                                            <input type="checkbox" {...register("allowOneTapApply")} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Allow Aganyu applicants to bypass this</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">If checked, candidates can still apply instantly using their Aganyu profile instead of following the external link.</p>
                                        </div>
                                    </label>
                                )}
                            </div>

                            <div className="h-px bg-slate-200 dark:bg-slate-800" />

                            <div className="space-y-4">
                                <label className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                                    Display Settings
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Posting Type</label>
                                        <select {...register("postingType")} className={cn(inputClass, "appearance-none")}>
                                            <option value="DIRECT">Direct Employer</option>
                                            <option value="AGENCY">Recruitment Agency</option>
                                            <option value="AGANYU">Aganyu Sourced</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Hiring Company Name (Optional)</label>
                                        <input {...register("displayCompanyName")} placeholder={`Overrides: ${companyNamePlaceholder}`} className={inputClass} />
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Use this if you are recruiting on behalf of a client.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 pt-2">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        >
                            {cancelLabel}
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={saving || submitDisabled}
                        title={submitDisabled ? submitDisabledTitle : undefined}
                        className={cn(
                            "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-colors",
                            submitDisabled
                                ? "bg-slate-400 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                        )}
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Briefcase size={18} />}
                        {saving ? "Posting…" : submitLabel}
                    </button>
                </div>
            </form>
        </div>
    );
}
